import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, isAdmin, signOut, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/trials?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            UI
          </div>
          <span className="hidden font-semibold text-lg sm:inline-block">
            UroInfo
          </span>
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Zoek medicijnen of studies..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/drugs">Medicijnen</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/trials">Studies</Link>
          </Button>
          
          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <User className="h-5 w-5" />
                  {isAdmin && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        Beheerportaal
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="flex items-center gap-2 cursor-pointer text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link to="/login">Inloggen</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
