import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { FilterPanel } from '@/components/trials/FilterPanel';
import { TrialCard } from '@/components/trials/TrialCard';
import { useTrials } from '@/hooks/useTrials';
import { TrialFilters } from '@/types/trial';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export default function TrialsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  const [filters, setFilters] = useState<TrialFilters>(() => {
    const disease = searchParams.get('disease');
    const intervention = searchParams.get('intervention');
    const search = searchParams.get('search');
    
    return {
      disease_area: disease ? [disease] : undefined,
      intervention_class: intervention ? [intervention] : undefined,
      search: search || undefined
    };
  });

  const { data: trials, isLoading } = useTrials(filters);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.disease_area?.length === 1) {
      params.set('disease', filters.disease_area[0]);
    }
    if (filters.intervention_class?.length === 1) {
      params.set('intervention', filters.intervention_class[0]);
    }
    if (filters.search) {
      params.set('search', filters.search);
    }
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchQuery || undefined });
  };

  const sortedTrials = trials?.slice().sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return (b.publication_year || 0) - (a.publication_year || 0);
      case 'oldest':
        return (a.publication_year || 0) - (b.publication_year || 0);
      case 'a-z':
        return a.acronym.localeCompare(b.acronym);
      case 'z-a':
        return b.acronym.localeCompare(a.acronym);
      case 'size':
        return (b.sample_size || 0) - (a.sample_size || 0);
      default:
        return 0;
    }
  });

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Clinical Trials</h1>
          <p className="text-muted-foreground">
            Browse and filter GU oncology clinical trials
          </p>
        </div>

        <div className="flex gap-6">
          {showFilters && (
            <FilterPanel filters={filters} onFiltersChange={setFilters} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search trials..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => {
                        setSearchQuery('');
                        setFilters({ ...filters, search: undefined });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button type="submit">Search</Button>
              </form>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="a-z">A to Z</SelectItem>
                    <SelectItem value="z-a">Z to A</SelectItem>
                    <SelectItem value="size">Sample size</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : sortedTrials && sortedTrials.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {sortedTrials.length} trial{sortedTrials.length !== 1 && 's'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedTrials.map((trial) => (
                    <TrialCard key={trial.id} trial={trial} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-2">No trials found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setFilters({});
                    setSearchQuery('');
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}