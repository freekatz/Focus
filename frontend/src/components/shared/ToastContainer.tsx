import { useToast } from '../../context/ToastContext';
import { Icons } from '../icons/Icons';

interface ToastContainerProps {
  darkMode: boolean;
}

export function ToastContainer({ darkMode }: ToastContainerProps) {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return darkMode
          ? 'bg-green-900/90 text-green-100 border-green-700'
          : 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return darkMode
          ? 'bg-red-900/90 text-red-100 border-red-700'
          : 'bg-red-50 text-red-800 border-red-200';
      case 'warning':
        return darkMode
          ? 'bg-yellow-900/90 text-yellow-100 border-yellow-700'
          : 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default:
        return darkMode
          ? 'bg-slate-800/95 text-slate-100 border-slate-600'
          : 'bg-white text-zinc-800 border-zinc-200';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Icons.Check />;
      case 'error':
        return <Icons.X />;
      case 'warning':
        return <Icons.Info />;
      default:
        return <Icons.Info />;
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-up min-w-[280px] max-w-[400px] ${getToastStyles(toast.type)}`}
        >
          <span className="flex-shrink-0 opacity-80">
            {getIcon(toast.type)}
          </span>
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <Icons.X />
          </button>
        </div>
      ))}
    </div>
  );
}
