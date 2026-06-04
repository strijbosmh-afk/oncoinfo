import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useDischargeDisciplines } from '@/hooks/useDischargeTemplates';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export function DischargeTemplatesSection() {
  const { permissions, isAdmin, isSuperAdmin } = useAuth();
  const canView = isAdmin || isSuperAdmin || !!permissions?.is_physician;
  const { disciplines, document } = useDischargeDisciplines(canView);

  if (!canView || disciplines.length === 0) return null;

  return (
    <div className="mt-12 max-w-6xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-center text-xl">Ontslagbrief Sjabonen</h2>
      </div>
      {document && (
        <p className="text-[11px] text-center text-muted-foreground mb-4">
          {document.document_title} · bijgewerkt {format(new Date(document.uploaded_at), 'dd/MM/yyyy')}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {disciplines.map(d => (
          <Link
            key={d}
            to={`/discharge-templates/${encodeURIComponent(d)}`}
            className="px-4 py-2 rounded-lg bg-background border-2 border-border hover:border-primary hover:bg-primary/5 text-sm font-medium text-foreground transition-colors shadow-sm"
          >
            {d}
          </Link>
        ))}
      </div>
    </div>
  );
}
