import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

export const getStatusIcon = (statusCode?: number) => {
  if (!statusCode) return <Clock className="w-4 h-4 text-yellow-400" />;
  if (statusCode >= 200 && statusCode < 300) return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (statusCode >= 400) return <AlertCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-yellow-400" />;
};

export const getStatusColor = (statusCode?: number) => {
  if (!statusCode) return 'text-yellow-400';
  if (statusCode >= 200 && statusCode < 300) return 'text-green-400';
  if (statusCode >= 400) return 'text-red-400';
  return 'text-yellow-400';
};