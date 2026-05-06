import { motion } from 'framer-motion';
import { GlassCard } from '../ui';
import { SpinnerIcon, CheckIcon, ClockIcon } from './activity-panel-icons';

// Streaming Status
export function StreamingStatus({ agentName }: { agentName: string }) {
  return (
    <GlassCard variant="subtle" padding="md" className="border border-orange-500/20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
          <SpinnerIcon />
        </div>
        <div>
          <p className="text-primary text-sm font-medium">Processando...</p>
          <p className="text-tertiary text-xs">{agentName} está gerando resposta</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 bg-[rgb(0_0_0/0.2)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    </GlassCard>
  );
}

// Ready Status
export function ReadyStatus({ messageCount }: { messageCount: number }) {
  return (
    <GlassCard variant="subtle" padding="md" className="border border-green-500/20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
          <CheckIcon />
        </div>
        <div>
          <p className="text-primary text-sm font-medium">Pronto</p>
          <p className="text-tertiary text-xs">{messageCount} mensagens na conversa</p>
        </div>
      </div>
    </GlassCard>
  );
}

// Waiting Status
export function WaitingStatus({ agentName }: { agentName: string }) {
  return (
    <GlassCard variant="subtle" padding="md" className="border border-blue-500/20">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
          <ClockIcon />
        </div>
        <div>
          <p className="text-primary text-sm font-medium">Aguardando</p>
          <p className="text-tertiary text-xs">Envie uma mensagem para {agentName}</p>
        </div>
      </div>
    </GlassCard>
  );
}
