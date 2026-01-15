import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/trials?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 gradient-medical opacity-5" />
      <div className="container relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-primary">Urologische Oncologie</span>
            <br />
            Klinische Studies Database
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Uw complete overzicht van klinische studies in de urologische oncologie. 
            Vind gestructureerde samenvattingen, overlevingsdata en AI-analyses voor 
            prostaat-, blaas-, nier-, testis- en peniskanker studies.
          </p>
          
          <form onSubmit={handleSearch} className="mt-10 flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Zoek op studienaam, medicijn, auteur of trefwoord..."
                className="h-12 pl-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-8">
              Zoeken
            </Button>
          </form>
          
          <p className="mt-4 text-sm text-muted-foreground">
            Probeer: ENZAMET, pembrolizumab, CheckMate, ARCHES
          </p>
        </div>
      </div>
    </section>
  );
}
