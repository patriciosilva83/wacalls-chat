import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";

export default function QuickMessagesPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t("nav.quickMessages", { defaultValue: "Respostas Rápidas" })}</h1>
        <p className="text-muted-foreground mt-2">Em breve: Respostas rápidas baseadas em atalhos.</p>
      </div>
    </AppShell>
  );
}
