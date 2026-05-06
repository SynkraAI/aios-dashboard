import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GlassCard, GlassButton, GlassInput } from '../ui';
import { apiClient } from '../../services/api/client';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';
import { SettingRow, EyeIcon, EyeOffIcon, RefreshIcon, PlusIcon, TrashIcon } from './SettingsHelpers';

// API Key Provider configuration
interface APIKeyProvider {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  color: string;
  icon: string;
  category: 'llm' | 'database' | 'scraper' | 'messaging' | 'crm' | 'other';
  envVar?: string;
}

const predefinedProviders: APIKeyProvider[] = [
  // LLM Providers
  { id: 'anthropic', name: 'Claude (Anthropic)', description: 'claude.ai/api', placeholder: 'sk-ant-api03-...', color: 'purple', icon: 'C', category: 'llm', envVar: 'ANTHROPIC_API_KEY' },
  { id: 'openai', name: 'OpenAI', description: 'platform.openai.com', placeholder: 'sk-...', color: 'green', icon: 'O', category: 'llm', envVar: 'OPENAI_API_KEY' },
  // Google Services
  { id: 'google-ads', name: 'Google Ads', description: 'ads.google.com', placeholder: 'Developer Token', color: 'blue', icon: 'GA', category: 'other', envVar: 'GOOGLE_ADS_DEVELOPER_TOKEN' },
  { id: 'google-analytics', name: 'Google Analytics 4', description: 'analytics.google.com', placeholder: 'G-XXXXXXXXXX', color: 'orange', icon: 'G4', category: 'other', envVar: 'GA4_MEASUREMENT_ID' },
  { id: 'google-gtm', name: 'Google Tag Manager', description: 'tagmanager.google.com', placeholder: 'GTM-XXXXXXX', color: 'blue', icon: 'TM', category: 'other', envVar: 'GTM_CONTAINER_ID' },
  // Database
  { id: 'supabase', name: 'Supabase', description: 'supabase.com', placeholder: 'eyJ...', color: 'emerald', icon: 'S', category: 'database', envVar: 'SUPABASE_KEY' },
  { id: 'qdrant', name: 'Qdrant', description: 'qdrant.tech', placeholder: 'api-key...', color: 'red', icon: 'Q', category: 'database', envVar: 'QDRANT_API_KEY' },
  // Scraper
  { id: 'apify', name: 'Apify', description: 'apify.com', placeholder: 'apify_api_...', color: 'cyan', icon: 'A', category: 'scraper', envVar: 'APIFY_API_TOKEN' },
  // Messaging
  { id: 'telegram', name: 'Telegram Bot', description: 'telegram.org', placeholder: '123456:ABC-...', color: 'blue', icon: 'T', category: 'messaging', envVar: 'TELEGRAM_BOT_TOKEN' },
  // CRM
  { id: 'activecampaign', name: 'ActiveCampaign', description: 'activecampaign.com', placeholder: 'api-key...', color: 'indigo', icon: 'AC', category: 'crm', envVar: 'ACTIVECAMPAIGN_API_KEY' },
  { id: 'clickup', name: 'ClickUp', description: 'clickup.com', placeholder: 'pk_...', color: 'pink', icon: 'CU', category: 'other', envVar: 'CLICKUP_API_TOKEN' },
];

const colorClasses: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
  purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/5', text: 'text-purple-400', iconBg: 'bg-purple-500/20' },
  green: { border: 'border-green-500/20', bg: 'bg-green-500/5', text: 'text-green-400', iconBg: 'bg-green-500/20' },
  emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
  red: { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-400', iconBg: 'bg-red-500/20' },
  cyan: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
  blue: { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
  indigo: { border: 'border-indigo-500/20', bg: 'bg-indigo-500/5', text: 'text-indigo-400', iconBg: 'bg-indigo-500/20' },
  pink: { border: 'border-pink-500/20', bg: 'bg-pink-500/5', text: 'text-pink-400', iconBg: 'bg-pink-500/20' },
  orange: { border: 'border-orange-500/20', bg: 'bg-orange-500/5', text: 'text-orange-400', iconBg: 'bg-orange-500/20' },
  yellow: { border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', text: 'text-yellow-400', iconBg: 'bg-yellow-500/20' },
  gray: { border: 'border-gray-500/20', bg: 'bg-gray-500/5', text: 'text-gray-400', iconBg: 'bg-gray-500/20' },
};

interface StoredAPIKey {
  id: string;
  providerId: string;
  name: string;
  value: string;
  color: string;
  icon: string;
  isCustom: boolean;
}

// Environment variable status type
interface EnvVarStatus {
  [key: string]: {
    isSet: boolean;
    preview?: string;
  };
}

// Add API Key Modal
function AddAPIKeyModal({
  providers,
  selectedCategory,
  onSelectCategory,
  onAddProvider,
  onAddCustom,
  onClose,
}: {
  providers: APIKeyProvider[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onAddProvider: (provider: APIKeyProvider) => void;
  onAddCustom: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('gray');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'llm', label: 'LLMs' },
    { id: 'database', label: 'Database' },
    { id: 'scraper', label: 'Scrapers' },
    { id: 'messaging', label: 'Messaging' },
    { id: 'crm', label: 'CRM' },
    { id: 'other', label: 'Outros' },
  ];

  const colorOptions = ['purple', 'green', 'blue', 'cyan', 'red', 'orange', 'pink', 'indigo', 'yellow', 'gray'];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[rgb(0_0_0/0.8)] backdrop-blur-md z-[100]"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[101] max-h-[80vh] overflow-hidden px-4"
      >
        <GlassCard className="flex flex-col max-h-[80vh] !bg-gray-900/95 border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Adicionar API Key</h2>
            <GlassButton variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </GlassButton>
          </div>

          {!showCustomForm ? (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-secondary hover:bg-white/20'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Provider List */}
              <div className="flex-1 overflow-y-auto glass-scrollbar space-y-2 mb-4">
                {providers.length === 0 ? (
                  <div className="text-center py-8 text-tertiary">
                    <p>Todos os provedores já foram adicionados</p>
                  </div>
                ) : (
                  providers.map((provider) => {
                    const colors = colorClasses[provider.color] || colorClasses.gray;
                    return (
                      <button
                        key={provider.id}
                        onClick={() => onAddProvider(provider)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                          colors.border,
                          'hover:bg-white/5'
                        )}
                      >
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', colors.iconBg)}>
                          <span className={cn('font-bold text-sm', colors.text)}>{provider.icon}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-primary font-medium">{provider.name}</p>
                          <p className="text-xs text-tertiary">{provider.description}</p>
                        </div>
                        <PlusIcon />
                      </button>
                    );
                  })
                )}
              </div>

              {/* Custom Key Button */}
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 text-secondary hover:text-primary hover:border-white/40 transition-colors"
              >
                <PlusIcon />
                <span>Adicionar chave personalizada</span>
              </button>
            </>
          ) : (
            <>
              {/* Custom Key Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-secondary mb-2">Nome do serviço</label>
                  <GlassInput
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex: Stripe, Twilio, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm text-secondary mb-2">Cor</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => {
                      const colors = colorClasses[color];
                      return (
                        <button
                          key={color}
                          onClick={() => setCustomColor(color)}
                          className={cn(
                            'w-8 h-8 rounded-lg border-2 transition-all',
                            colors.iconBg,
                            customColor === color
                              ? 'border-white scale-110'
                              : 'border-transparent hover:scale-105'
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <GlassButton variant="ghost" onClick={() => setShowCustomForm(false)} className="flex-1">
                  Voltar
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={() => customName && onAddCustom(customName, customColor)}
                  disabled={!customName}
                  className="flex-1"
                >
                  Adicionar
                </GlassButton>
              </div>
            </>
          )}
        </GlassCard>
      </motion.div>
    </>
  );
}

export function APISettings() {
  const { success, error: showError } = useToast();

  // Fetch environment variables status from API
  const { data: envVarsStatus, refetch: refetchEnvVars } = useQuery<EnvVarStatus>({
    queryKey: ['env-vars-status'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ envVars: EnvVarStatus }>('/system/env-vars');
        return response.envVars || {};
      } catch {
        return {};
      }
    },
    staleTime: 60000,
  });

  // Load saved keys from localStorage
  const [apiKeys, setApiKeys] = useState<StoredAPIKey[]>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('aios-api-keys'); } catch { /* storage unavailable */ }
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return predefinedProviders.slice(0, 2).map(p => ({
      id: p.id,
      providerId: p.id,
      name: p.name,
      value: '',
      color: p.color,
      icon: p.icon,
      isCustom: false,
    }));
  });

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const updateKeyValue = (keyId: string, value: string) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, value } : k))
    );
  };

  const deleteKey = (keyId: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    success('Removido', 'API Key removida');
  };

  const addProvider = (provider: APIKeyProvider) => {
    const exists = apiKeys.some((k) => k.providerId === provider.id);
    if (exists) {
      showError('Já existe', `${provider.name} já foi adicionado`);
      return;
    }

    setApiKeys((prev) => [
      ...prev,
      {
        id: `${provider.id}-${Date.now()}`,
        providerId: provider.id,
        name: provider.name,
        value: '',
        color: provider.color,
        icon: provider.icon,
        isCustom: false,
      },
    ]);
    setShowAddModal(false);
    success('Adicionado', `${provider.name} adicionado`);
  };

  const addCustomKey = (name: string, color: string) => {
    setApiKeys((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        providerId: 'custom',
        name,
        value: '',
        color,
        icon: name.charAt(0).toUpperCase(),
        isCustom: true,
      },
    ]);
    setShowAddModal(false);
    success('Adicionado', `${name} adicionado`);
  };

  const handleSaveKeys = () => {
    try { localStorage.setItem('aios-api-keys', JSON.stringify(apiKeys)); } catch { /* storage unavailable */ }
    success('Salvo!', 'API Keys salvas com sucesso');
  };

  const availableProviders = predefinedProviders.filter(
    (p) => !apiKeys.some((k) => k.providerId === p.id)
  );

  const filteredProviders = selectedCategory === 'all'
    ? availableProviders
    : availableProviders.filter((p) => p.category === selectedCategory);

  const isEnvVarSet = (envVar?: string): boolean => {
    if (!envVar || !envVarsStatus) return false;
    return envVarsStatus[envVar]?.isSet || false;
  };

  const getEnvVarPreview = (envVar?: string): string | undefined => {
    if (!envVar || !envVarsStatus) return undefined;
    return envVarsStatus[envVar]?.preview;
  };

  const envVarCount = predefinedProviders.filter(p => p.envVar && isEnvVarSet(p.envVar)).length;
  const manualCount = apiKeys.filter(k => k.value).length;

  return (
    <div className="space-y-6">
      {/* Sync Status Banner */}
      <GlassCard className="!bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <div>
              <p className="text-primary font-medium">Sincronização de Chaves</p>
              <p className="text-xs text-tertiary">
                {envVarCount > 0 ? (
                  <>
                    <span className="text-green-400">{envVarCount} via env</span>
                    {manualCount > 0 && <span className="text-secondary"> • {manualCount} manual</span>}
                  </>
                ) : (
                  <span>As chaves podem ser configuradas via variáveis de ambiente ou manualmente</span>
                )}
              </p>
            </div>
          </div>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => refetchEnvVars()}
            title="Verificar variáveis de ambiente"
          >
            <RefreshIcon />
            <span className="ml-1 text-xs">Sincronizar</span>
          </GlassButton>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-tertiary">
              Configure suas chaves de API. Chaves via variáveis de ambiente têm prioridade.
            </p>
          </div>
          <GlassButton variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <PlusIcon />
            <span className="ml-1">Adicionar</span>
          </GlassButton>
        </div>

        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-tertiary">
              <p>Nenhuma API Key configurada</p>
              <p className="text-xs mt-1">Clique em "Adicionar" para começar</p>
            </div>
          ) : (
            apiKeys.map((key) => {
              const colors = colorClasses[key.color] || colorClasses.gray;
              const isVisible = visibleKeys.has(key.id);
              const provider = predefinedProviders.find((p) => p.id === key.providerId);
              const hasEnvVar = provider?.envVar && isEnvVarSet(provider.envVar);
              const envPreview = provider?.envVar ? getEnvVarPreview(provider.envVar) : undefined;

              return (
                <div
                  key={key.id}
                  className={cn(
                    'p-4 rounded-xl border',
                    hasEnvVar ? 'border-green-500/30 bg-green-500/5' : colors.border,
                    !hasEnvVar && colors.bg
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', colors.iconBg)}>
                      <span className={cn('font-bold text-sm', colors.text)}>{key.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-primary font-medium">{key.name}</p>
                        {hasEnvVar && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">
                            ENV
                          </span>
                        )}
                      </div>
                      {provider && (
                        <p className="text-xs text-tertiary">{provider.description}</p>
                      )}
                    </div>
                    <GlassButton
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteKey(key.id)}
                      className="text-red-400 hover:bg-red-500/10"
                      title="Remover"
                      aria-label="Remover"
                    >
                      <TrashIcon />
                    </GlassButton>
                  </div>

                  {hasEnvVar ? (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-xs text-green-400 font-medium">Configurado via variável de ambiente</span>
                      </div>
                      <p className="text-[10px] text-green-400/70">
                        <code className="bg-green-500/10 px-1 rounded">{provider?.envVar}</code>
                        {envPreview && <span className="ml-2">= {envPreview}</span>}
                      </p>
                      <p className="text-[10px] text-tertiary mt-1">
                        Para alterar, atualize a variável de ambiente no servidor
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <GlassInput
                          type={isVisible ? 'text' : 'password'}
                          value={key.value}
                          onChange={(e) => updateKeyValue(key.id, e.target.value)}
                          placeholder={provider?.placeholder || 'Sua API key...'}
                          className="pr-10"
                        />
                        <button
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
                          aria-label={isVisible ? 'Ocultar chave' : 'Mostrar chave'}
                        >
                          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      {provider?.envVar && (
                        <p className="text-[10px] text-tertiary mt-2">
                          Ou defina a variável: <code className="bg-white/10 px-1 rounded">{provider.envVar}</code>
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-primary mb-4">Configurações de Modelo</h2>

        <div className="space-y-4">
          <SettingRow
            label="Modelo padrão"
            description="Modelo usado quando não especificado"
            action={
              <select className="p-2 rounded-lg text-sm border border-white/10 bg-[#1a1a1a] text-white cursor-pointer" aria-label="Selecionar modelo padrão">
                <option value="claude-sonnet">Claude Sonnet 4</option>
                <option value="claude-opus">Claude Opus 4</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
            }
          />

          <SettingRow
            label="Temperatura"
            description="Criatividade das respostas (0-1)"
            action={
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="70"
                className="w-24 accent-blue-500"
                aria-label="Temperatura"
              />
            }
          />

          <SettingRow
            label="Max tokens"
            description="Limite de tokens por resposta"
            action={
              <select className="p-2 rounded-lg text-sm border border-white/10 bg-[#1a1a1a] text-white cursor-pointer" aria-label="Selecionar max tokens">
                <option value="2048">2048</option>
                <option value="4096">4096</option>
                <option value="8192">8192</option>
              </select>
            }
          />
        </div>
      </GlassCard>

      <div className="flex justify-end">
        <GlassButton variant="primary" onClick={handleSaveKeys}>
          Salvar API Keys
        </GlassButton>
      </div>

      {/* Add API Key Modal */}
      {createPortal(
        <AnimatePresence>
          {showAddModal && (
            <AddAPIKeyModal
              providers={filteredProviders}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onAddProvider={addProvider}
              onAddCustom={addCustomKey}
              onClose={() => setShowAddModal(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
