import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t("nav.announcements", { defaultValue: "Mural de Avisos" })}</h1>
        <p className="text-muted-foreground mt-2">Em breve: Avisos e comunicados internos.</p>
      </div>
    </AppShell>
  );
}
