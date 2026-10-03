import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Sparkles, MapPin, ArrowRight, ShieldCheck, Sprout } from 'lucide-react';
import { WeatherCard } from '@/components/domain/weather-card';
import { AajKyaKarein } from '@/components/domain/aaj-kya-karein';
import { AlertCard } from '@/components/domain/alert-card';
import { FasalBechniCard } from '@/components/domain/fasal-bechni-card';
import { CropCard } from '@/components/domain/crop-card';
import { WhyExplanation } from '@/components/domain/why-explanation';
import { ChatSuggestionChip } from '@/components/domain/chat-suggestion';
import { SectionHeader } from '@/components/ui/section-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/context/AuthContext';
import { recommendationApi } from '@/api';
import { ROUTES } from '@/routes/paths';

const HOME_CHAT_SUGGESTIONS = [
  { id: 'cs1', icon: '🌧️', textKey: 'उद्या पाऊस पडेल का?', query: 'उद्या पाऊस पडेल का?' },
  { id: 'cs2', icon: '💧', textKey: 'पिकाला पाणी कधी द्यावे?', query: 'पिकाला पाणी कधी द्यावे?' },
  { id: 'cs3', icon: '💰', textKey: 'गव्हाचा आजचा बाजारभाव काय?', query: 'गव्हाचा आजचा बाजारभाव काय?' },
  { id: 'cs4', icon: '🧪', textKey: 'माती परीक्षण कसे करावे?', query: 'माती परीक्षण कसे करावे?' },
];

export default function HomePage() {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const { isAuthenticated, farmer } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();
  const [showWhy, setShowWhy] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState onRetry={refetch} description={error} />;
  }

  if (!data) return null;

  const { weather, recommendations, alerts, bestMarket, crops, farmingImplications } = data;
  const primaryAction = recommendations.find(r => r.id === selectedActionId) || recommendations[0];
  const farmingNote = farmingImplications?.[0]?.actionKey || t('weather.farming_note');

  const handleActionComplete = async (action: any) => {
    if (action.category === 'market') {
      navigate(ROUTES.MARKET);
    } else {
      try {
        await recommendationApi.completeAction(action.id);
        refetch();
      } catch (e) {
        console.warn('Could not complete action:', e);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* HERO SECTION WITH GENUINE LOCAL FARM IMAGE ASSET */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg border border-agri-forest-800/10">
        <div className="absolute inset-0">
          <img
            src="/assets/hero-farm.jpg"
            alt="KisanIQ Indian Agricultural Landscape"
            className="w-full h-full object-cover object-center filter brightness-[0.78] contrast-[1.08]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-agri-forest-950/95 via-agri-forest-900/60 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8 md:p-10 text-white z-10 flex flex-col justify-end min-h-[240px] sm:min-h-[270px]">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-agri-leaf-600/90 backdrop-blur-md text-white text-xs font-semibold tracking-wide uppercase border border-agri-leaf-300/30">
              <Sparkles className="h-3.5 w-3.5" />
              KisanIQ कृषी निर्णय प्रणाली
            </span>
            {data.farmer?.location && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium">
                <MapPin className="h-3 w-3 text-agri-gold-300" />
                {data.farmer.location}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
            पेरणीपासून ते विक्रीपर्यंत, प्रत्येक टप्प्यावर हुशार निर्णय
          </h1>
          <p className="text-sm sm:text-base text-sand-100/95 mt-2 max-w-xl font-normal">
            हवामान, माती आरोग्य, पीक संरक्षण आणि भारत सरकारच्या अधिकृत AGMARKNET बाजारभावावर आधारित निर्णय.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            {!isAuthenticated ? (
              <>
                <Button
                  variant="gold"
                  size="md"
                  onClick={() => navigate(ROUTES.REGISTER)}
                  className="font-bold shadow-md hover:scale-[1.02] transition-transform"
                >
                  <span>सुरू करा (नोंदणी)</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(ROUTES.MARKET)}
                  className="bg-white/95 text-agri-forest-900 font-semibold border-white hover:bg-white"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>बाजार भाव पहा</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="gold"
                  size="md"
                  onClick={() => navigate(ROUTES.MARKET)}
                  className="font-bold shadow-md hover:scale-[1.02] transition-transform"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>बाजार भाव तपासा</span>
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(ROUTES.SOIL_TESTING)}
                  className="bg-white/95 text-agri-forest-900 font-semibold border-white hover:bg-white"
                >
                  <Sprout className="h-4 w-4" />
                  <span>माती परीक्षण</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* REAL WEATHER CARD */}
      <WeatherCard
        weather={weather}
        farmingNote={farmingNote}
        onClick={() => navigate(ROUTES.WEATHER)}
      />

      {/* AAJ KYA KAREIN - Explainable Decision Engine Hero */}
      {recommendations && recommendations.length > 0 && (
        <>
          <AajKyaKarein
            actions={recommendations}
            onWhyClick={(action) => {
              setSelectedActionId(action.id);
              setShowWhy(prev => (selectedActionId === action.id ? !prev : true));
            }}
            onActionClick={handleActionComplete}
          />

          {/* Why explanation (transparent, data-backed) */}
          {showWhy && primaryAction?.whyExplanation && (
            <WhyExplanation
              explanation={primaryAction.whyExplanation}
              className="animate-in slide-in-from-bottom-2"
            />
          )}
        </>
      )}

      {/* REAL AGRONOMIC ALERTS */}
      {alerts && alerts.length > 0 && (
        <AlertCard
          alert={alerts[0]}
          onDetails={() => navigate(ROUTES.RISK)}
        />
      )}

      {/* FASAL BECHNI HAI - Best Market Rate & Decision */}
      {bestMarket && (
        <FasalBechniCard
          cropName={crops[0]?.name || 'Wheat'}
          bestMarketName={bestMarket.name}
          bestPrice={bestMarket.price}
          riskLevel={bestMarket.riskLevel}
          onClick={() => navigate(ROUTES.MARKET)}
        />
      )}

      {/* CROP OVERVIEW */}
      <div>
        <SectionHeader
          title={t('crop_overview.title')}
          icon={<span className="text-lg">🌾</span>}
          action={{
            label: t('crop_overview.view_details'),
            onClick: () => navigate(ROUTES.MERI_FASAL),
          }}
        />
        {crops && crops.length > 0 ? (
          <div className="space-y-3">
            {crops.map((crop) => (
              <CropCard
                key={crop.id}
                crop={crop}
                onClick={() => navigate(ROUTES.MERI_FASAL)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-sand-300 bg-sand-50/50">
            <CardContent className="p-4 sm:p-6 text-center">
              <p className="text-sm font-semibold text-sand-800">अद्याप कोणतेही पीक जोडलेले नाही</p>
              <p className="text-xs text-sand-500 mt-1 mb-4">
                आपल्या शेतातील पिकांची नोंद करा जेणेकरून अचूक सिंचन आणि रोग व्यवस्थापन सल्ला मिळू शकेल.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(ROUTES.MERI_FASAL)}
              >
                + नवीन पीक जोडा
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ASK KISANIQ VOICE / TEXT CHAT */}
      <div>
        <SectionHeader
          title={t('assistant.title')}
          icon={<span className="text-lg">🤖</span>}
          action={{
            label: t('common:buttons.view_all'),
            onClick: () => navigate(ROUTES.ASSISTANT),
          }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HOME_CHAT_SUGGESTIONS.map((suggestion) => (
            <ChatSuggestionChip
              key={suggestion.id}
              suggestion={suggestion}
              onClick={() => navigate(ROUTES.ASSISTANT, { state: { initialQuery: suggestion.query } })}
            />
          ))}
        </div>
      </div>

      {/* PROFESSIONAL FOOTER WITH OFFICIAL ATTRIBUTION & DISCLAIMER */}
      <footer className="mt-8 pt-6 pb-4 border-t border-sand-200 text-center text-xs text-sand-500 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-3 font-medium text-sand-600">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-agri-forest-700" />
            भारत सरकार AGMARKNET अधिकृत बाजार दर
          </span>
          <span>•</span>
          <span>Open-Meteo व IMD हवामान सेवा</span>
          <span>•</span>
          <span>ICAR माती परीक्षण निकष</span>
        </div>
        <p className="max-w-xl mx-auto text-sand-400">
          KisanIQ — भारतीय शेतकऱ्यांसाठी समर्पित डिजिटल कृषी सहाय्यक. सर्व बाजारभाव आणि हवामान अंदाज थेट अधिकृत स्रोतांवरून घेतलेले आहेत.
        </p>
        <p className="text-sand-400 font-mono text-[11px]">
          © {new Date().getFullYear()} KisanIQ. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
