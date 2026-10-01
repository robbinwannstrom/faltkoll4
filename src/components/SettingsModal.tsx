import React, { useState, useEffect } from 'react';
import {
  UserSettings,
  AppLayoutMode,
  AppColorPalette,
  PreInspectionPreference,
  ProjectType,
  UserAccount,
  AppContextMode,
  CustomColorTheme,
} from '../types';
import { getContextVocabulary, resolveAppContextMode } from '../utils/contextLabels';
import {
  X,
  Sliders,
  Check,
  Palette,
  Layers,
  ShieldCheck,
  Camera,
  User,
  Sparkles,
  Sun,
  Flame,
  Zap,
  Compass,
  AlertTriangle,
  RotateCcw,
  QrCode,
  Smartphone,
  Copy,
  ExternalLink,
  Lock,
} from 'lucide-react';
import QRCode from 'qrcode';
import { getAppUrl } from '../utils/appUrl';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  onUpdateUserSettings: (newSettings: UserSettings) => void;
  onRerunWizard?: () => void;
  currentUser?: UserAccount | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userSettings,
  onUpdateUserSettings,
  onRerunWizard,
  currentUser,
}) => {
  const isStudentAccount = currentUser?.role === 'STUDENT';
  const [activeTab, setActiveTab] = useState<'QR_MOBILE' | 'LAYOUT' | 'PALETTE' | 'PREINSPECTION' | 'PHOTO' | 'PROFILE'>('LAYOUT');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>(userSettings.customDeployUrl || '');

  const activeUrl = getAppUrl(customUrl);

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(activeUrl, {
        width: 440,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Kunde inte generera QR-kod:', err));
    }
  }, [isOpen, activeUrl]);

  // Form states initialized from userSettings
  const [contextMode, setContextMode] = useState<AppContextMode>(
    resolveAppContextMode(userSettings, currentUser)
  );
  const [layoutMode, setLayoutMode] = useState<AppLayoutMode>(userSettings.appLayoutMode || 'SIMPLE_LIST');
  const [palette, setPalette] = useState<AppColorPalette>(userSettings.colorPalette || 'ORANGE_WORK');
  const [customAccent, setCustomAccent] = useState<string>(
    userSettings.activeCustomTheme?.accentHex || '#f97316'
  );
  const [customBg, setCustomBg] = useState<string>(
    userSettings.activeCustomTheme?.bgHex || '#121212'
  );
  const [customCard, setCustomCard] = useState<string>(
    userSettings.activeCustomTheme?.cardHex || '#1a1a1a'
  );
  const [customBtnText, setCustomBtnText] = useState<string>(
    userSettings.activeCustomTheme?.buttonTextHex || '#000000'
  );
  const [customThemeName, setCustomThemeName] = useState<string>(
    userSettings.activeCustomTheme?.name || 'Mitt Eget Färgtema'
  );
  const [savedThemes, setSavedThemes] = useState<CustomColorTheme[]>(
    userSettings.savedCustomThemes || []
  );
  const [themeSavedFeedback, setThemeSavedFeedback] = useState<string | null>(null);
  const [preInspPref, setPreInspPref] = useState<PreInspectionPreference>(userSettings.preInspectionPreference || 'ALWAYS_ASK');
  const [requirePhoto, setRequirePhoto] = useState<boolean>(!!userSettings.requirePhotoToComplete);
  const [saveToGallery, setSaveToGallery] = useState<boolean>(!!userSettings.saveToDeviceGallery);
  const [watermark, setWatermark] = useState<boolean>(userSettings.featurePhotoWatermark !== false);
  const [userName, setUserName] = useState<string>(userSettings.userName || '');
  const [companyName, setCompanyName] = useState<string>(userSettings.companyName || '');
  const [preferredType, setPreferredType] = useState<ProjectType | 'ALL'>(userSettings.preferredProjectType || 'ALL');

  const vocab = getContextVocabulary(contextMode);

  if (!isOpen) return null;

  const handleApplyChanges = (partial?: Partial<UserSettings>) => {
    const updated: UserSettings = {
      ...userSettings,
      appContextMode: contextMode,
      appLayoutMode: layoutMode,
      colorPalette: palette,
      activeCustomTheme: {
        id: userSettings.activeCustomTheme?.id || 'custom_active',
        name: customThemeName.trim() || 'Mitt Eget Färgtema',
        accentHex: customAccent,
        bgHex: customBg,
        cardHex: customCard,
        buttonTextHex: customBtnText,
      },
      savedCustomThemes: savedThemes,
      preInspectionPreference: preInspPref,
      requirePhotoToComplete: requirePhoto,
      saveToDeviceGallery: saveToGallery,
      featurePhotoWatermark: watermark,
      userName: userName.trim(),
      companyName: companyName.trim(),
      preferredProjectType: preferredType,
      customDeployUrl: customUrl.trim(),
      ...partial,
    };
    onUpdateUserSettings(updated);
  };

  const handleSelectContextMode = (newMode: AppContextMode) => {
    setContextMode(newMode);
    handleApplyChanges({ appContextMode: newMode });
  };

  const handleUpdateLiveCustomColor = (
    field: 'accent' | 'bg' | 'card' | 'btnText',
    val: string
  ) => {
    const nextAccent = field === 'accent' ? val : customAccent;
    const nextBg = field === 'bg' ? val : customBg;
    const nextCard = field === 'card' ? val : customCard;
    const nextBtnText = field === 'btnText' ? val : customBtnText;

    if (field === 'accent') setCustomAccent(val);
    if (field === 'bg') setCustomBg(val);
    if (field === 'card') setCustomCard(val);
    if (field === 'btnText') setCustomBtnText(val);
    setPalette('CUSTOM');

    handleApplyChanges({
      colorPalette: 'CUSTOM',
      activeCustomTheme: {
        id: 'custom_live',
        name: customThemeName.trim() || 'Mitt Eget Färgtema',
        accentHex: nextAccent,
        bgHex: nextBg,
        cardHex: nextCard,
        buttonTextHex: nextBtnText,
      },
    });
  };

  const handleSaveCustomPreset = () => {
    const newPreset: CustomColorTheme = {
      id: 'theme_' + Date.now(),
      name: customThemeName.trim() || `Eget tema ${savedThemes.length + 1}`,
      accentHex: customAccent,
      bgHex: customBg,
      cardHex: customCard,
      buttonTextHex: customBtnText,
    };
    const nextSaved = [newPreset, ...savedThemes.filter((t) => t.name !== newPreset.name)];
    setSavedThemes(nextSaved);
    setPalette('CUSTOM');
    handleApplyChanges({
      colorPalette: 'CUSTOM',
      activeCustomTheme: newPreset,
      savedCustomThemes: nextSaved,
    });
    setThemeSavedFeedback(`Temat "${newPreset.name}" är sparat och aktiverat!`);
    setTimeout(() => setThemeSavedFeedback(null), 3500);
  };

  const handleApplySavedPreset = (preset: CustomColorTheme) => {
    setCustomThemeName(preset.name);
    setCustomAccent(preset.accentHex);
    setCustomBg(preset.bgHex);
    setCustomCard(preset.cardHex);
    setCustomBtnText(preset.buttonTextHex);
    setPalette('CUSTOM');
    handleApplyChanges({
      colorPalette: 'CUSTOM',
      activeCustomTheme: preset,
    });
  };

  const handleDeleteSavedPreset = (id: string) => {
    const nextSaved = savedThemes.filter((t) => t.id !== id);
    setSavedThemes(nextSaved);
    handleApplyChanges({ savedCustomThemes: nextSaved });
  };

  const handleSelectLayout = (mode: AppLayoutMode) => {
    setLayoutMode(mode);
    handleApplyChanges({ appLayoutMode: mode });
  };

  const handleSelectPalette = (pal: AppColorPalette) => {
    setPalette(pal);
    handleApplyChanges({ colorPalette: pal });
  };

  const handleSelectPreInsp = (pref: PreInspectionPreference) => {
    setPreInspPref(pref);
    handleApplyChanges({ preInspectionPreference: pref });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121212] border-2 border-[#2c2c2c] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#262626] flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <Sliders className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Inställningar & Appanpassning
              </h2>
              <p className="text-xs text-slate-400">
                Anpassa layout, tydlighet, färgpalett och försyn för fältarbetet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#222222] hover:bg-[#2e2e2e] text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#262626] bg-[#141414] px-3 overflow-x-auto gap-1 py-1.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('QR_MOBILE')}
            className={`min-h-[40px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'QR_MOBILE'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20 font-black'
                : 'text-orange-400 hover:text-white hover:bg-[#222222]'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Mobil & QR-kod</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LAYOUT')}
            className={`min-h-[40px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'LAYOUT'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-[#222222]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Layout & Tydlighet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PALETTE')}
            className={`min-h-[40px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'PALETTE'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-[#222222]'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Färgpalett</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PREINSPECTION')}
            className={`min-h-[40px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'PREINSPECTION'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-[#222222]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Försyn & Skador</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PHOTO')}
            className={`min-h-[40px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'PHOTO'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-[#222222]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Foto & Kamera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`min-h-[40px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'PROFILE'
                ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20 font-black'
                : 'text-slate-400 hover:text-white hover:bg-[#222222]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil & Namn</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 0: MOBIL & QR-KOD */}
          {activeTab === 'QR_MOBILE' && (
            <div className="space-y-4 flex flex-col items-center text-center">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Öppna appen i mobilen
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Skanna QR-koden med mobilens vanliga kamera för att öppna och testa appen direkt i telefonen.
                </p>
              </div>

              {/* QR Container */}
              <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-orange-500/40 inline-flex flex-col items-center">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR-kod till appen"
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-black font-bold text-sm">
                    Genererar QR-kod...
                  </div>
                )}
                <span className="text-[11px] font-mono font-bold text-slate-800 mt-2">
                  Kameraskanning • Direkt till mobilen
                </span>
              </div>

              {/* URL & Quick copy */}
              <div className="w-full max-w-md space-y-3">
                {/* Custom URL Input Field */}
                <div className="p-3 bg-[#181818] border border-[#2e2e2e] rounded-xl text-left space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    Anpassad webbadress för QR-kod:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://robbinwannstrom.github.io/faltkoll2/"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="flex-1 bg-[#121212] border border-[#333333] focus:border-orange-500 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyChanges({ customDeployUrl: customUrl.trim() })}
                      className="px-3 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-lg cursor-pointer transition-colors shrink-0"
                    >
                      Spara
                    </button>
                  </div>
                  {customUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomUrl('');
                        handleApplyChanges({ customDeployUrl: '' });
                      }}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Återställ till standardadress
                    </button>
                  )}
                </div>

                {/* Display Current URL */}
                <div className="flex items-center gap-2 bg-[#181818] border border-[#2e2e2e] p-2 rounded-xl text-left">
                  <div className="min-w-0 flex-1 px-2 font-mono text-xs text-orange-400 truncate">
                    {activeUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(activeUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="min-h-[36px] px-3 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Kopierad!' : 'Kopiera'}</span>
                  </button>
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[36px] px-2.5 bg-[#262626] hover:bg-[#333333] text-slate-200 rounded-lg flex items-center justify-center shrink-0"
                    title="Öppna i ny flik"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-3 bg-[#181818] border border-[#2a2a2a] rounded-xl text-left text-xs text-slate-300 space-y-1">
                  <span className="font-bold text-white block flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-orange-400" /> Tips för mobilskärmen:
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    När du öppnat länken i mobilen, klicka på webbläsarens meny och välj <strong>Lägg till på hemskärmen</strong> eller <strong>Installera app</strong>. Då körs den i fullskärm som en vanlig app!
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* TAB 1: LAYOUT & VERKSAMHETSLÄGE */}
          {activeTab === 'LAYOUT' && (
            <div className="space-y-6">
              {/* VERKSAMHETSLÄGE: LÅST TILL KONTOTS TYP NÄR INLOGGAD */}
              <div className="space-y-3 pb-5 border-b border-[#262626]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-white">
                      1. Verksamhetsläge ({vocab.modeBadge})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verksamhetsläget styrs automatiskt av ditt inloggade konto ({vocab.modeTitle}).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-300 text-xs font-black shrink-0">
                    {vocab.modeBadge}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#181818] border border-[#2c2c2c] flex items-start gap-2.5 text-xs text-slate-300">
                  <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Ditt konto är kopplat till <strong className="text-white">{vocab.modeTitle}</strong>. För att byta mellan Arbetsplats, APL och Skola behöver du logga ut och logga in med ett konto som tillhör den verksamheten.
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-white">2. Välj App-Layout & Detaljnivå</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bestäm hur information och knappar ska presenteras i fält.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Enkel Lista (Ingen Bling) */}
                <button
                  type="button"
                  onClick={() => handleSelectLayout('SIMPLE_LIST')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === 'SIMPLE_LIST'
                      ? 'bg-orange-500/10 border-orange-500 text-white'
                      : 'bg-[#181818] border-[#2c2c2c] text-slate-300 hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white">
                          Enkel Lista (Ingen Bling)
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-black px-2 py-0.5 rounded-md">
                          Standard
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Ren, avskalad listvy utan skuggor, stora rutor eller visuellt brus. Filter och extraverktyg ligger samlade under knappar.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        layoutMode === 'SIMPLE_LIST'
                          ? 'border-orange-500 bg-orange-500 text-black'
                          : 'border-[#444] bg-[#121212]'
                      }`}
                    >
                      {layoutMode === 'SIMPLE_LIST' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>

                {/* 2. Kompakt Tabellvy */}
                <button
                  type="button"
                  onClick={() => handleSelectLayout('COMPACT')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === 'COMPACT'
                      ? 'bg-orange-500/10 border-orange-500 text-white'
                      : 'bg-[#181818] border-[#2c2c2c] text-slate-300 hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white">
                          Kompakt Tabellvy
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Extra täta rader för maximal överblick när du vill se många projekt och moment på skärmen samtidigt.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        layoutMode === 'COMPACT'
                          ? 'border-orange-500 bg-orange-500 text-black'
                          : 'border-[#444] bg-[#121212]'
                      }`}
                    >
                      {layoutMode === 'COMPACT' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>

                {/* 3. Stora Fältkort */}
                <button
                  type="button"
                  onClick={() => handleSelectLayout('FIELD_CLEAR')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === 'FIELD_CLEAR'
                      ? 'bg-orange-500/10 border-orange-500 text-white'
                      : 'bg-[#181818] border-[#2c2c2c] text-slate-300 hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white">
                          Stora Fältkort (Handskläge)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Större kort och extra breda knappar anpassade för arbete utomhus med handskar.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        layoutMode === 'FIELD_CLEAR'
                          ? 'border-orange-500 bg-orange-500 text-black'
                          : 'border-[#444] bg-[#121212]'
                      }`}
                    >
                      {layoutMode === 'FIELD_CLEAR' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>

                {/* 4. Steg-för-steg (Fokusvy) */}
                <button
                  type="button"
                  onClick={() => handleSelectLayout('GUIDED_STEP')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    layoutMode === 'GUIDED_STEP'
                      ? 'bg-orange-500/10 border-orange-500 text-white'
                      : 'bg-[#181818] border-[#2c2c2c] text-slate-300 hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white">
                          Steg-för-steg (Fokusvy)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Visar utförliga instruktioner och hjälptexter direkt vid varje delmoment.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        layoutMode === 'GUIDED_STEP'
                          ? 'border-orange-500 bg-orange-500 text-black'
                          : 'border-[#444] bg-[#121212]'
                      }`}
                    >
                      {layoutMode === 'GUIDED_STEP' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FÄRGPALETT */}
          {activeTab === 'PALETTE' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-white">Välj Färgpalett</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Välj det färgtema som ger bäst kontrast i den miljö du arbetar (inomhus, gråväder eller starkt solljus).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Varselorange */}
                <button
                  type="button"
                  onClick={() => handleSelectPalette('ORANGE_WORK')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    palette === 'ORANGE_WORK'
                      ? 'bg-orange-500/15 border-orange-500 text-white ring-1 ring-orange-500'
                      : 'bg-[#181818] border-[#2c2c2c] hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-orange-500 shadow-sm border border-orange-300"></span>
                      <span className="font-bold text-sm text-white">Varselorange & Grafit</span>
                    </div>
                    {palette === 'ORANGE_WORK' && <Check className="w-4 h-4 text-orange-400 stroke-[3]" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Klassisk svensk byggstandard i mörkton med skarp varselorange.
                  </p>
                </button>

                {/* 2. Varselgul */}
                <button
                  type="button"
                  onClick={() => handleSelectPalette('SAFETY_YELLOW')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    palette === 'SAFETY_YELLOW'
                      ? 'bg-yellow-500/15 border-yellow-400 text-white ring-1 ring-yellow-400'
                      : 'bg-[#181818] border-[#2c2c2c] hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-yellow-400 shadow-sm border border-yellow-200"></span>
                      <span className="font-bold text-sm text-white">Varselgul / Hi-Vis</span>
                    </div>
                    {palette === 'SAFETY_YELLOW' && <Check className="w-4 h-4 text-yellow-400 stroke-[3]" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Vägarbetsstandard med extremt hög synlighet mot asfalt.
                  </p>
                </button>

                {/* 3. Dagsljus Ljus */}
                <button
                  type="button"
                  onClick={() => handleSelectPalette('DAYLIGHT_HIGH_CONTRAST')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    palette === 'DAYLIGHT_HIGH_CONTRAST'
                      ? 'bg-orange-500/15 border-orange-500 text-white ring-1 ring-orange-500'
                      : 'bg-[#181818] border-[#2c2c2c] hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-white shadow-sm border border-slate-400 flex items-center justify-center text-[10px]">☀️</span>
                      <span className="font-bold text-sm text-white">Högkontrast Dagsljus</span>
                    </div>
                    {palette === 'DAYLIGHT_HIGH_CONTRAST' && <Check className="w-4 h-4 text-orange-400 stroke-[3]" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Ljust läge för direkt solsken på bygget där mörka skärmar speglar sig.
                  </p>
                </button>

                {/* 4. Proffsblå */}
                <button
                  type="button"
                  onClick={() => handleSelectPalette('NORDIC_BLUE')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    palette === 'NORDIC_BLUE'
                      ? 'bg-sky-500/15 border-sky-400 text-white ring-1 ring-sky-400'
                      : 'bg-[#181818] border-[#2c2c2c] hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-sky-500 shadow-sm border border-sky-300"></span>
                      <span className="font-bold text-sm text-white">Nordisk Proffsblå</span>
                    </div>
                    {palette === 'NORDIC_BLUE' && <Check className="w-4 h-4 text-sky-400 stroke-[3]" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Stålgrå och marinblå företagsstil för entreprenader och besiktning.
                  </p>
                </button>

                {/* 5. Maskingrön / Skog */}
                <button
                  type="button"
                  onClick={() => handleSelectPalette('EMERALD_FOREST')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    palette === 'EMERALD_FOREST'
                      ? 'bg-emerald-500/15 border-emerald-400 text-white ring-1 ring-emerald-400'
                      : 'bg-[#181818] border-[#2c2c2c] hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 shadow-sm border border-emerald-300"></span>
                      <span className="font-bold text-sm text-white">Anläggningsgrön</span>
                    </div>
                    {palette === 'EMERALD_FOREST' && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Lugn och tydlig smaragdgrön kontrast mot mörk skifferbakgrund.
                  </p>
                </button>

                {/* 6. Eget Custom Färgtema */}
                <button
                  type="button"
                  onClick={() => handleSelectPalette('CUSTOM')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    palette === 'CUSTOM'
                      ? 'bg-orange-500/15 border-orange-500 text-white ring-1 ring-orange-500'
                      : 'bg-[#181818] border-[#2c2c2c] hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full shadow-sm border border-white/40"
                        style={{ backgroundColor: customAccent }}
                      ></span>
                      <span className="font-bold text-sm text-white">Eget Färgtema (Custom)</span>
                    </div>
                    {palette === 'CUSTOM' && <Check className="w-4 h-4 text-orange-400 stroke-[3]" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Justera accentfärg, bakgrund och paneler helt själv och spara dina favoriter.
                  </p>
                </button>
              </div>

              {/* CUSTOM COLOR STUDIO */}
              <div className="mt-4 p-5 rounded-2xl bg-[#161616] border border-[#2c2c2c] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <Palette className="w-4 h-4 text-orange-400" />
                      <span>Skapa & Spara Eget Färgtema (Custom)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Välj exakt de färger du eller ditt företag vill ha. Ändringarna syns direkt!
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {palette === 'CUSTOM' ? 'Aktivt läge: Custom' : 'Klicka på en färg för att aktivera'}
                  </span>
                </div>

                {/* Snabbval för accentfärg */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 block">
                    Snabbval för accentfärg:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: 'Varselorange', hex: '#f97316', text: '#000000' },
                      { label: 'Maskingul', hex: '#eab308', text: '#000000' },
                      { label: 'Smaragdgrön', hex: '#10b981', text: '#000000' },
                      { label: 'Himmelsblå', hex: '#0ea5e9', text: '#000000' },
                      { label: 'Kungsblå', hex: '#3b82f6', text: '#ffffff' },
                      { label: 'Rubinröd', hex: '#ef4444', text: '#ffffff' },
                      { label: 'Violett', hex: '#8b5cf6', text: '#ffffff' },
                      { label: 'Turkosa', hex: '#14b8a6', text: '#000000' },
                    ].map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        onClick={() => {
                          setCustomAccent(sw.hex);
                          setCustomBtnText(sw.text);
                          setPalette('CUSTOM');
                          handleApplyChanges({
                            colorPalette: 'CUSTOM',
                            activeCustomTheme: {
                              id: 'custom_swatch',
                              name: customThemeName.trim() || sw.label,
                              accentHex: sw.hex,
                              bgHex: customBg,
                              cardHex: customCard,
                              buttonTextHex: sw.text,
                            },
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#121212] hover:bg-[#202020] border border-[#333] text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: sw.hex }}
                        />
                        <span>{sw.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detaljerade färgväljare */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#2a2a2a] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">1. Accent- & Knappfärg</span>
                      <span className="text-[11px] font-mono text-slate-400">{customAccent}</span>
                    </div>
                    <input
                      type="color"
                      value={customAccent}
                      onChange={(e) => handleUpdateLiveCustomColor('accent', e.target.value)}
                      className="w-11 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#121212] border border-[#2a2a2a] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">2. Huvudbakgrund</span>
                      <span className="text-[11px] font-mono text-slate-400">{customBg}</span>
                    </div>
                    <input
                      type="color"
                      value={customBg}
                      onChange={(e) => handleUpdateLiveCustomColor('bg', e.target.value)}
                      className="w-11 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#121212] border border-[#2a2a2a] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">3. Kort- & Panelytor</span>
                      <span className="text-[11px] font-mono text-slate-400">{customCard}</span>
                    </div>
                    <input
                      type="color"
                      value={customCard}
                      onChange={(e) => handleUpdateLiveCustomColor('card', e.target.value)}
                      className="w-11 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#121212] border border-[#2a2a2a] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">4. Text på knappar</span>
                      <span className="text-[11px] text-slate-400">Kontrast på accentknapp</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateLiveCustomColor('btnText', '#000000')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                          customBtnText === '#000000'
                            ? 'bg-white text-black border-white'
                            : 'bg-[#1a1a1a] text-slate-400 border-[#333]'
                        }`}
                      >
                        Svart
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLiveCustomColor('btnText', '#ffffff')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                          customBtnText === '#ffffff'
                            ? 'bg-white text-black border-white'
                            : 'bg-[#1a1a1a] text-slate-400 border-[#333]'
                        }`}
                      >
                        Vit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Spara som namngivet tema */}
                <div className="pt-2 border-t border-[#262626] space-y-2.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Namnge och spara ditt eget tema:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={customThemeName}
                      onChange={(e) => setCustomThemeName(e.target.value)}
                      placeholder="T.ex. Företagets profil eller Grävmaskin Gul..."
                      className="flex-1 min-h-[42px] px-3.5 bg-[#121212] border border-[#333] rounded-xl text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomPreset}
                      className="min-h-[42px] px-4 bg-orange-500 hover:bg-orange-400 text-black font-black text-xs rounded-xl cursor-pointer transition-all shrink-0"
                    >
                      Spara som Custom-tema
                    </button>
                  </div>

                  {themeSavedFeedback && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{themeSavedFeedback}</span>
                    </div>
                  )}

                  {savedThemes.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-slate-400 block">
                        Dina sparade egna teman ({savedThemes.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {savedThemes.map((preset) => (
                          <div
                            key={preset.id}
                            className="p-2.5 rounded-xl bg-[#121212] border border-[#2c2c2c] flex items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => handleApplySavedPreset(preset)}
                              className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                            >
                              <div className="flex items-center -space-x-1 shrink-0">
                                <span
                                  className="w-4 h-4 rounded-full border border-white/30"
                                  style={{ backgroundColor: preset.accentHex }}
                                />
                                <span
                                  className="w-4 h-4 rounded-full border border-white/30"
                                  style={{ backgroundColor: preset.bgHex }}
                                />
                              </div>
                              <span className="text-xs font-bold text-white truncate">
                                {preset.name}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedPreset(preset.id)}
                              className="px-2 py-1 text-[11px] text-slate-500 hover:text-rose-400 cursor-pointer"
                              title="Ta bort sparat tema"
                            >
                              Ta bort
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FÖRSYN & SKADEGUIDE */}
          {activeTab === 'PREINSPECTION' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-white">Standard för Försyn & Skadeguide</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bestäm om du vill bli påmind om att fota fasad och tomtgränser, eller hoppa över det automatiskt vid privat bygge.
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. Hoppa över försyn som standard */}
                <button
                  type="button"
                  onClick={() => handleSelectPreInsp('SKIP_DEFAULT')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    preInspPref === 'SKIP_DEFAULT'
                      ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500'
                      : 'bg-[#181818] border-[#2c2c2c] text-slate-300 hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>🏡 Hoppa över försyn som standard (Privat bruk / Altan)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Inga tvingande eller tjatiga påminnelser om att fota grannens fasad vid projektstart. Perfekt för privatpersoner som bygger altan eller fixar på egen tomt.
                      </p>
                    </div>
                    {preInspPref === 'SKIP_DEFAULT' && <Check className="w-4 h-4 text-amber-400 stroke-[3] shrink-0" />}
                  </div>
                </button>

                {/* 2. Fråga varje gång */}
                <button
                  type="button"
                  onClick={() => handleSelectPreInsp('ALWAYS_ASK')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    preInspPref === 'ALWAYS_ASK'
                      ? 'bg-orange-500/10 border-orange-500 text-white ring-1 ring-orange-500'
                      : 'bg-[#181818] border-[#2c2c2c] text-slate-300 hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>⚖️ Fråga vid varje nytt projekt (Standard)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Ett enkelt val visas när du skapar ett projekt där du kan välja att göra eller hoppa över försynen med ett klick.
                      </p>
                    </div>
                    {preInspPref === 'ALWAYS_ASK' && <Check className="w-4 h-4 text-orange-400 stroke-[3] shrink-0" />}
                  </div>
                </button>

                {/* 3. Gör alltid försyn */}
                <button
                  type="button"
                  onClick={() => handleSelectPreInsp('ALWAYS_DO')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    preInspPref === 'ALWAYS_DO'
                      ? 'bg-emerald-500/10 border-emerald-500 text-white ring-1 ring-emerald-500'
                      : 'bg-[#181818] border-[#2c2c2c] text-slate-300 hover:border-[#3c3c3c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>🛡️ Gör alltid försyn (Entreprenad & Maskinister)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Rekommenderat för företag och anläggare för att säkra bevis mot skadeståndskrav från grannfastigheter innan tunga maskiner startar.
                      </p>
                    </div>
                    {preInspPref === 'ALWAYS_DO' && <Check className="w-4 h-4 text-emerald-400 stroke-[3] shrink-0" />}
                  </div>
                </button>
              </div>

              {/* Varning & Info */}
              <div className="p-3.5 rounded-2xl bg-[#1e1710] border border-amber-600/40 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Varning för konsekvenser:</span>
                </div>
                <p className="leading-relaxed text-amber-100/90">
                  Om du hoppar över försynen kan du när som helst göra den senare under schakt- eller förberedelsemomentet i checklistan.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: FOTO & KAMERA */}
          {activeTab === 'PHOTO' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-white">Foto & Dokumentation</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bestäm hur kameran fungerar och om foton är obligatoriska för att godkänna moment.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#181818] border border-[#2c2c2c] flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-sm text-white block">Kräv foto före godkännande</span>
                    <span className="text-xs text-slate-400">
                      Om avstängd kan du signera moment grönt direkt utan att ladda upp fotobevis.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !requirePhoto;
                      setRequirePhoto(next);
                      handleApplyChanges({ requirePhotoToComplete: next });
                    }}
                    className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      requirePhoto ? 'bg-orange-500' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        requirePhoto ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#181818] border border-[#2c2c2c] flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-sm text-white block">Spara kopia i mobilens kamerarulle</span>
                    <span className="text-xs text-slate-400">
                      Laddar ner en extra kopia av varje taget foto till telefonens bildgalleri.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !saveToGallery;
                      setSaveToGallery(next);
                      handleApplyChanges({ saveToDeviceGallery: next });
                    }}
                    className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      saveToGallery ? 'bg-orange-500' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        saveToGallery ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#181818] border border-[#2c2c2c] flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-sm text-white block">Inbränd tidsstämpel & vattenstämpel</span>
                    <span className="text-xs text-slate-400">
                      Bränner in datum, klockslag och momentnamn i fotot för juridiskt bevisvärde.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !watermark;
                      setWatermark(next);
                      handleApplyChanges({ featurePhotoWatermark: next });
                    }}
                    className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      watermark ? 'bg-orange-500' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        watermark ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PROFIL & NAMN */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-white">Användarprofil & Signatur</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dessa uppgifter förifylls automatiskt vid signering och på kontrollrapporter.
                </p>
              </div>

              {isStudentAccount && (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-amber-300 block">
                      {vocab.roleStudentShort}-konto (Rank 1) är låst för egen ändring
                    </strong>
                    Du kan inte ändra namn, grupp eller tillhörighet på ditt eget konto. Endast din{' '}
                    <strong>{vocab.roleTeacherShort} (Rank 2)</strong> eller{' '}
                    <strong>{vocab.roleSchoolAdminShort} / {vocab.roleAdmin} (Rank 3–4)</strong> kan redigera dina kontouppgifter.
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Ditt Namn (Signatur)
                  </label>
                  <input
                    type="text"
                    value={isStudentAccount ? (currentUser?.displayName || userName) : userName}
                    disabled={isStudentAccount}
                    onChange={(e) => {
                      if (isStudentAccount) return;
                      setUserName(e.target.value);
                      handleApplyChanges({ userName: e.target.value });
                    }}
                    placeholder="Förnamn Efternamn"
                    className={`w-full min-h-[46px] px-3.5 bg-[#181818] border border-[#333333] focus:border-orange-500 rounded-xl text-white text-sm outline-none ${
                      isStudentAccount ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Företag, Skola eller Grupp
                  </label>
                  <input
                    type="text"
                    value={
                      isStudentAccount
                        ? `${currentUser?.studentGroup || ''} ${currentUser?.schoolClass ? `(${currentUser.schoolClass})` : currentUser?.schoolOrCompany || ''}`.trim() || companyName
                        : companyName
                    }
                    disabled={isStudentAccount}
                    onChange={(e) => {
                      if (isStudentAccount) return;
                      setCompanyName(e.target.value);
                      handleApplyChanges({ companyName: e.target.value });
                    }}
                    placeholder="T.ex. Mark & Bygg / Privatfastighet"
                    className={`w-full min-h-[46px] px-3.5 bg-[#181818] border border-[#333333] focus:border-orange-500 rounded-xl text-white text-sm outline-none ${
                      isStudentAccount ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Rerun Wizard Button */}
              {onRerunWizard && (
                <div className="pt-4 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRerunWizard();
                    }}
                    className="w-full min-h-[46px] px-4 rounded-xl bg-[#1c1c1c] hover:bg-[#282828] text-slate-300 hover:text-white border border-[#383838] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-orange-400" />
                    <span>Kör startguiden / Wizarden igen</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#161616] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 bg-orange-500 hover:bg-orange-400 active:scale-95 text-black font-black text-sm rounded-xl cursor-pointer shadow-md shadow-orange-500/20 transition-all"
          >
            Stäng & Spara
          </button>
        </div>
      </div>
    </div>
  );
};
