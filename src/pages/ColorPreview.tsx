import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Stethoscope, Baby, Search, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const palettes = [
  {
    name: '1. Diep Amethist',
    description: 'Premium, medisch-professioneel',
    primary: '320 45% 35%',
    primaryLight: '320 45% 45%',
    accent: '340 65% 55%',
    bg: '300 15% 97%',
    card: '0 0% 100%',
    muted: '300 10% 93%',
    foreground: '280 25% 15%',
    mutedFg: '280 15% 45%',
    categoryColors: [
      { label: 'Borst', bg: 'hsl(340 65% 55% / 0.12)', text: 'hsl(340 65% 55%)' },
      { label: 'Urologie', bg: 'hsl(260 55% 50% / 0.12)', text: 'hsl(260 55% 50%)' },
      { label: 'Gynecologie', bg: 'hsl(300 45% 45% / 0.12)', text: 'hsl(300 45% 45%)' },
    ],
  },
  {
    name: '2. Warm Teal + Koraal',
    description: 'Modern, vriendelijk en energiek',
    primary: '174 75% 28%',
    primaryLight: '174 65% 38%',
    accent: '12 80% 58%',
    bg: '170 18% 97%',
    card: '0 0% 100%',
    muted: '170 12% 93%',
    foreground: '180 25% 12%',
    mutedFg: '175 15% 42%',
    categoryColors: [
      { label: 'Borst', bg: 'hsl(12 80% 58% / 0.12)', text: 'hsl(12 80% 58%)' },
      { label: 'Urologie', bg: 'hsl(174 65% 38% / 0.12)', text: 'hsl(174 65% 38%)' },
      { label: 'Gynecologie', bg: 'hsl(280 50% 55% / 0.12)', text: 'hsl(280 50% 55%)' },
    ],
  },
  {
    name: '3. Nachtblauw + Goud',
    description: 'Klassiek, betrouwbaar en luxueus',
    primary: '215 55% 28%',
    primaryLight: '215 55% 38%',
    accent: '42 85% 52%',
    bg: '220 18% 97%',
    card: '0 0% 100%',
    muted: '220 14% 93%',
    foreground: '220 30% 12%',
    mutedFg: '218 15% 42%',
    categoryColors: [
      { label: 'Borst', bg: 'hsl(340 65% 52% / 0.12)', text: 'hsl(340 65% 52%)' },
      { label: 'Urologie', bg: 'hsl(215 55% 38% / 0.12)', text: 'hsl(215 55% 38%)' },
      { label: 'Gynecologie', bg: 'hsl(42 85% 52% / 0.12)', text: 'hsl(42 75% 42%)' },
    ],
  },
  {
    name: '4. Oceaanblauw (verrijkt)',
    description: 'Subtiele upgrade van het huidige schema',
    primary: '199 85% 28%',
    primaryLight: '199 80% 38%',
    accent: '174 70% 35%',
    bg: '210 22% 97%',
    card: '0 0% 100%',
    muted: '210 18% 93%',
    foreground: '215 30% 12%',
    mutedFg: '215 16% 42%',
    categoryColors: [
      { label: 'Borst', bg: 'hsl(340 70% 55% / 0.12)', text: 'hsl(340 70% 55%)' },
      { label: 'Urologie', bg: 'hsl(199 80% 38% / 0.12)', text: 'hsl(199 80% 38%)' },
      { label: 'Gynecologie', bg: 'hsl(270 55% 55% / 0.12)', text: 'hsl(270 55% 55%)' },
    ],
  },
];

const icons = [Heart, Stethoscope, Baby];

const ColorPreview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Kleurenschema Preview</h1>
          <p className="text-muted-foreground mb-4">Klik op een schema om het toe te passen</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            ← Terug naar home
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {palettes.map((palette) => (
            <div
              key={palette.name}
              className="rounded-2xl border-2 border-border overflow-hidden shadow-lg"
              style={{ backgroundColor: `hsl(${palette.bg})` }}
            >
              {/* Header bar */}
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ backgroundColor: `hsl(${palette.primary})` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">OI</span>
                  </div>
                  <span className="text-white font-semibold text-lg">OncoInfo</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/15" />
                  <div className="w-8 h-8 rounded-full bg-white/15" />
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Palette label */}
                <div>
                  <h3
                    className="text-xl font-bold"
                    style={{ color: `hsl(${palette.foreground})` }}
                  >
                    {palette.name}
                  </h3>
                  <p className="text-sm" style={{ color: `hsl(${palette.mutedFg})` }}>
                    {palette.description}
                  </p>
                </div>

                {/* Search bar */}
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3 border-2"
                  style={{
                    backgroundColor: `hsl(${palette.card})`,
                    borderColor: `hsl(${palette.muted})`,
                  }}
                >
                  <Search className="h-5 w-5" style={{ color: `hsl(${palette.mutedFg})` }} />
                  <span className="text-sm" style={{ color: `hsl(${palette.mutedFg})` }}>
                    Zoek een medicijn...
                  </span>
                </div>

                {/* Category cards */}
                <div className="grid grid-cols-3 gap-3">
                  {palette.categoryColors.map((cat, i) => {
                    const Icon = icons[i];
                    return (
                      <div
                        key={cat.label}
                        className="rounded-xl p-3 text-center border"
                        style={{
                          backgroundColor: `hsl(${palette.card})`,
                          borderColor: `hsl(${palette.muted})`,
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center"
                          style={{ backgroundColor: cat.bg }}
                        >
                          <Icon className="h-5 w-5" style={{ color: cat.text }} />
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: `hsl(${palette.foreground})` }}
                        >
                          {cat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Buttons row */}
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: `hsl(${palette.primary})` }}
                  >
                    Primaire knop <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: `hsl(${palette.accent})`,
                      color: 'white',
                    }}
                  >
                    Accent knop <CheckCircle className="h-4 w-4" />
                  </button>
                </div>

                {/* Color swatches */}
                <div className="flex gap-2 pt-1">
                  {[palette.primary, palette.primaryLight, palette.accent, palette.muted, palette.mutedFg].map(
                    (c, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full h-6 rounded-md"
                          style={{ backgroundColor: `hsl(${c})` }}
                        />
                        <span className="text-[9px]" style={{ color: `hsl(${palette.mutedFg})` }}>
                          {['Primary', 'Light', 'Accent', 'Muted', 'Text'][i]}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPreview;
