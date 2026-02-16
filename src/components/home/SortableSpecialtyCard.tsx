import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Lock, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

interface SpecialtyCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
  isDisabled: boolean;
  isReordering: boolean;
  onDisabledClick: (e: React.MouseEvent) => void;
}

export function SortableSpecialtyCard({
  id, title, description, icon: Icon, href, color, bgColor,
  isDisabled, isReordering, onDisabledClick,
}: SpecialtyCardProps) {
  const { t } = useTranslation();
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id, disabled: !isReordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  if (isDisabled) {
    return (
      <div ref={setNodeRef} style={style} onClick={onDisabledClick} className="cursor-not-allowed">
        <Card className="h-full relative overflow-hidden border-2 border-muted opacity-50 grayscale">
          <div className="absolute top-3 right-3 z-10">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardHeader className="relative pb-2">
            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Icon className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl text-muted-foreground">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="relative pt-0">
            <Button variant="ghost" className="w-full" disabled>
              {t('home.viewDrugs')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // When reordering is enabled (logged in), card is draggable but also navigable
  return (
    <div ref={setNodeRef} style={style}>
      <Link to={href}>
        <Card className="h-full group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {isReordering && (
            <div
              {...attributes}
              {...listeners}
              className="absolute top-2 right-2 z-10 p-1 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity touch-none"
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <CardHeader className="relative pb-2">
            <div className={`h-14 w-14 rounded-xl ${bgColor} flex items-center justify-center mb-4`}>
              <Icon className={`h-7 w-7 ${color}`} />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="relative pt-0">
            <Button variant="ghost" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
              {t('home.viewDrugs')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
