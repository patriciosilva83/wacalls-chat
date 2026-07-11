package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// WebhookPayload represents the general payload structure sent to webhooks.
type WebhookPayload struct {
	Event     string    `json:"event"`
	Timestamp int64     `json:"timestamp"`
	TenantID  string    `json:"tenantId"`
	SessionID string    `json:"sessionId"`
	Data      interface{} `json:"data"`
}

// dispatchWebhook fires a webhook event asynchronously.
func (s *Session) dispatchWebhook(eventType string, data interface{}) {
	s.mu.Lock()
	enabled := s.webhookEnabled
	url := strings.TrimSpace(s.webhookURL)
	secret := s.webhookSecret
	s.mu.Unlock()

	if !enabled || url == "" {
		return
	}

	go func() {
		payload := WebhookPayload{
			Event:     eventType,
			Timestamp: time.Now().UnixMilli(),
			TenantID:  s.ownerID,
			SessionID: s.id,
			Data:      data,
		}

		bodyBytes, err := json.Marshal(payload)
		if err != nil {
			s.log.Error("webhook marshal failed", "event", eventType, "err", err)
			return
		}

		req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
		if err != nil {
			s.log.Error("webhook request create failed", "url", url, "err", err)
			return
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-AstraCalls-Tenant", s.ownerID)
		req.Header.Set("X-AstraCalls-Session", s.id)

		if secret != "" {
			mac := hmac.New(sha256.New, []byte(secret))
			mac.Write(bodyBytes)
			signature := hex.EncodeToString(mac.Sum(nil))
			req.Header.Set("X-AstraCalls-Signature", signature)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		req = req.WithContext(ctx)

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			s.log.Warn("webhook dispatch failed", "url", url, "event", eventType, "err", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			s.log.Warn("webhook returned non-2xx status", "url", url, "status", resp.Status)
		}
	}()
}

// syncMessageToChatwoot posts an incoming or outgoing message to a Chatwoot inbox.
func (s *Session) syncMessageToChatwoot(row MessageRow) {
	s.mu.Lock()
	enabled := s.chatwootEnabled
	apiURL := strings.TrimRight(strings.TrimSpace(s.chatwootURL), "/")
	token := strings.TrimSpace(s.chatwootToken)
	accountID := strings.TrimSpace(s.chatwootAccountID)
	inboxID := strings.TrimSpace(s.chatwootInboxID)
	s.mu.Unlock()

	if !enabled || apiURL == "" || token == "" || accountID == "" || inboxID == "" {
		return
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
		defer cancel()

		client := &http.Client{Timeout: 20 * time.Second}
		baseURL := fmt.Sprintf("%s/api/v1/accounts/%s", apiURL, accountID)

		// 1. Resolve target phone number and name
		phone := cleanJIDToPhone(row.ChatJID)
		name := phone
		if s.mgr.chatMeta != nil {
			if existing, _, _ := s.mgr.chatMeta.Get(ctx, s.id, row.ChatJID); existing.Name != "" {
				name = existing.Name
			}
		}

		// 2. Search contact in Chatwoot
		contactID, err := findOrCreateChatwootContact(ctx, client, baseURL, token, inboxID, phone, name)
		if err != nil {
			s.log.Error("chatwoot contact sync failed", "phone", phone, "err", err)
			return
		}

		// 3. Find or create conversation
		conversationID, err := findOrCreateChatwootConversation(ctx, client, baseURL, token, inboxID, contactID)
		if err != nil {
			s.log.Error("chatwoot conversation sync failed", "contactID", contactID, "err", err)
			return
		}

		// 4. Post message to Chatwoot
		msgType := "incoming"
		if row.FromMe {
			msgType = "outgoing"
		}

		content := row.Body
		if row.MediaURL != "" {
			mediaLabel := "[Mídia]"
			if row.Kind != "" {
				mediaLabel = fmt.Sprintf("[%s]", strings.ToUpper(row.Kind))
			}
			if content != "" {
				content = fmt.Sprintf("%s\n\n%s: %s", content, mediaLabel, row.MediaURL)
			} else {
				content = fmt.Sprintf("%s: %s", mediaLabel, row.MediaURL)
			}
		}

		err = postChatwootMessage(ctx, client, baseURL, token, conversationID, msgType, content)
		if err != nil {
			s.log.Error("chatwoot message post failed", "convID", conversationID, "err", err)
		}
	}()
}

// cleanJIDToPhone extracts numbers from a whatsapp JID (e.g. 5511999999999@s.whatsapp.net -> +5511999999999).
func cleanJIDToPhone(jid string) string {
	parts := strings.Split(jid, "@")
	if len(parts) == 0 {
		return ""
	}
	clean := parts[0]
	subparts := strings.Split(clean, ":")
	if len(subparts) > 0 {
		clean = subparts[0]
	}
	// Append "+" for Chatwoot compatibility
	return "+" + clean
}

func findOrCreateChatwootContact(ctx context.Context, client *http.Client, baseURL, token, inboxID, phone, name string) (int, error) {
	// Search contact by phone
	searchURL := fmt.Sprintf("%s/contacts/search?q=%s", baseURL, phone)
	req, _ := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	req.Header.Set("api_access_token", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var searchResult struct {
			Payload []struct {
				ID          int    `json:"id"`
				PhoneNumber string `json:"phone_number"`
			} `json:"payload"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&searchResult); err == nil && len(searchResult.Payload) > 0 {
			return searchResult.Payload[0].ID, nil
		}
	}

	// Create contact if not found
	createURL := fmt.Sprintf("%s/contacts", baseURL)
	bodyMap := map[string]interface{}{
		"name":         name,
		"phone_number": phone,
		"inbox_id":     inboxID,
	}
	bodyBytes, _ := json.Marshal(bodyMap)

	req, _ = http.NewRequestWithContext(ctx, "POST", createURL, bytes.NewReader(bodyBytes))
	req.Header.Set("api_access_token", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var createResult struct {
		Payload struct {
			Contact struct {
				ID int `json:"id"`
			} `json:"contact"`
		} `json:"payload"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&createResult); err == nil && createResult.Payload.Contact.ID != 0 {
		return createResult.Payload.Contact.ID, nil
	}

	return 0, fmt.Errorf("unable to search or create chatwoot contact (status: %d)", resp.StatusCode)
}

func findOrCreateChatwootConversation(ctx context.Context, client *http.Client, baseURL, token, inboxID, contactID string) (int, error) {
	// Search active conversations
	convsURL := fmt.Sprintf("%s/contacts/%d/conversations", baseURL, contactID)
	req, _ := http.NewRequestWithContext(ctx, "GET", convsURL, nil)
	req.Header.Set("api_access_token", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var listResult []struct {
			ID      int    `json:"id"`
			InboxID int    `json:"inbox_id"`
			Status  string `json:"status"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&listResult); err == nil {
			for _, c := range listResult {
				// Match active conversation for this specific inbox
				if fmt.Sprintf("%d", c.InboxID) == inboxID && c.Status != "resolved" {
					return c.ID, nil
				}
			}
		}
	}

	// Create conversation if none active
	createURL := fmt.Sprintf("%s/conversations", baseURL)
	bodyMap := map[string]interface{}{
		"contact_id": contactID,
		"inbox_id":    inboxID,
		"status":      "open",
	}
	bodyBytes, _ := json.Marshal(bodyMap)

	req, _ = http.NewRequestWithContext(ctx, "POST", createURL, bytes.NewReader(bodyBytes))
	req.Header.Set("api_access_token", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var createResult struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&createResult); err == nil && createResult.ID != 0 {
		return createResult.ID, nil
	}

	// Fallback attempt to parse standard Chatwoot wrapper payload
	bodyString, _ := io.ReadAll(resp.Body)
	var nestedResult struct {
		Payload struct {
			ID int `json:"id"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(bodyString, &nestedResult); err == nil && nestedResult.Payload.ID != 0 {
		return nestedResult.Payload.ID, nil
	}

	return 0, fmt.Errorf("failed to create chatwoot conversation (status: %d)", resp.StatusCode)
}

func postChatwootMessage(ctx context.Context, client *http.Client, baseURL, token string, conversationID int, msgType, content string) error {
	postURL := fmt.Sprintf("%s/conversations/%d/messages", baseURL, conversationID)
	bodyMap := map[string]interface{}{
		"content":      content,
		"message_type": msgType,
		"private":      false,
	}
	bodyBytes, _ := json.Marshal(bodyMap)

	req, _ := http.NewRequestWithContext(ctx, "POST", postURL, bytes.NewReader(bodyBytes))
	req.Header.Set("api_access_token", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("chatwoot message api returned status %d", resp.StatusCode)
	}
	return nil
}
