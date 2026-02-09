import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Drug } from '@/types/drug';
import { SortableDrugCard } from './SortableDrugCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Pill, GripVertical, Check, X, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useUserDrugOrder } from '@/hooks/useUserDrugOrder';

interface SortableDrugListProps {
  combinationDrugs: Drug[];
  individualDrugs: Drug[];
  viewMode: 'all' | 'combinations' | 'individual';
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isAdmin: boolean;
  isEditMode: boolean;
  onEditModeChange: (editing: boolean) => void;
}

export function SortableDrugList({
  combinationDrugs,
  individualDrugs,
  viewMode,
  isFavorite,
  toggleFavorite,
  isAdmin,
  isEditMode,
  onEditModeChange,
}: SortableDrugListProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [localCombinations, setLocalCombinations] = useState<Drug[]>(combinationDrugs);
  const [localIndividuals, setLocalIndividuals] = useState<Drug[]>(individualDrugs);
  const queryClient = useQueryClient();
  const { saveOrder, hasCustomOrder } = useUserDrugOrder();

  // Sync local state when props change (but not during edit mode)
  if (!isEditMode && (localCombinations !== combinationDrugs || localIndividuals !== individualDrugs)) {
    setLocalCombinations(combinationDrugs);
    setLocalIndividuals(individualDrugs);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, type: 'combinations' | 'individuals') => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      if (type === 'combinations') {
        setLocalCombinations((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      } else {
        setLocalIndividuals((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isAdmin) {
        // Admin: save to drugs table (global order)
        const updates: { id: string; display_order: number }[] = [];
        
        localCombinations.forEach((drug, index) => {
          updates.push({ id: drug.id, display_order: index });
        });
        
        localIndividuals.forEach((drug, index) => {
          updates.push({ id: drug.id, display_order: 1000 + index });
        });

        for (const update of updates) {
          const { error } = await supabase
            .from('drugs')
            .update({ display_order: update.display_order })
            .eq('id', update.id);
          
          if (error) throw error;
        }

        await queryClient.invalidateQueries({ queryKey: ['drugs'] });
      } else {
        // Regular user: save to user_drug_order table (personal order)
        const orders: { drug_id: string; display_order: number }[] = [];
        
        localCombinations.forEach((drug, index) => {
          orders.push({ drug_id: drug.id, display_order: index });
        });
        
        localIndividuals.forEach((drug, index) => {
          orders.push({ drug_id: drug.id, display_order: 1000 + index });
        });

        await saveOrder.mutateAsync(orders);
      }
      
      toast.success('Volgorde opgeslagen');
      onEditModeChange(false);
    } catch (err) {
      console.error('Error saving order:', err);
      toast.error('Fout bij opslaan volgorde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetOrder = async () => {
    setIsSaving(true);
    try {
      await saveOrder.mutateAsync([]);
      await queryClient.invalidateQueries({ queryKey: ['drugs'] });
      toast.success('Volgorde hersteld naar standaard');
      onEditModeChange(false);
    } catch (err) {
      console.error('Error resetting order:', err);
      toast.error('Fout bij herstellen volgorde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalCombinations(combinationDrugs);
    setLocalIndividuals(individualDrugs);
    onEditModeChange(false);
  };

  const showCombinations = viewMode === 'all' || viewMode === 'combinations';
  const showIndividuals = viewMode === 'all' || viewMode === 'individual';

  return (
    <div className="space-y-4">
      {/* Edit mode save/cancel controls */}
      {isEditMode && (
        <>
          <div className="flex items-center justify-end gap-2 mb-4">
            {!isAdmin && hasCustomOrder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetOrder}
                disabled={isSaving}
                className="gap-2 text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Standaard herstellen
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Annuleren
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Opslaan
            </Button>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <GripVertical className="h-4 w-4" />
              Sleep de kaarten om de volgorde aan te passen. Klik op "Opslaan" om de wijzigingen te bewaren.
            </p>
          </div>
        </>
      )}

      {/* Combination Regimens Section */}
      {localCombinations.length > 0 && showCombinations && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-semibold">Combinatieschema's</h2>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
              {localCombinations.length}
            </Badge>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, 'combinations')}
          >
            <SortableContext
              items={localCombinations.map((d) => d.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {localCombinations.map((drug) => (
                  <SortableDrugCard
                    key={drug.id}
                    drug={drug}
                    isFavorite={isFavorite(drug.id)}
                    onToggleFavorite={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(drug.id);
                    }}
                    isEditMode={isEditMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Individual Drugs Section */}
      {localIndividuals.length > 0 && showIndividuals && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Pill className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Individuele Medicijnen</h2>
            <Badge variant="secondary">{localIndividuals.length}</Badge>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, 'individuals')}
          >
            <SortableContext
              items={localIndividuals.map((d) => d.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {localIndividuals.map((drug) => (
                  <SortableDrugCard
                    key={drug.id}
                    drug={drug}
                    isFavorite={isFavorite(drug.id)}
                    onToggleFavorite={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(drug.id);
                    }}
                    isEditMode={isEditMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
