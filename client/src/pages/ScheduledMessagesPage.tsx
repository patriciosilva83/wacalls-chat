import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";

export default function ScheduledMessagesPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t("nav.scheduled", { defaultValue: "Agendamentos" })}</h1>
        <p className="text-muted-foreground mt-2">Em breve: Agendamento de mensagens para clientes.</p>
      </div>
    </AppShell>
  );
}
