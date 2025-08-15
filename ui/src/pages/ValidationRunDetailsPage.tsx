import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  Play,
  Activity
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
import { QUERY_CONFIG } from '../constants/api';
import type { SessionMetrics, ValidationAttemptMetrics } from '../types/api';
import { ValidationStage } from '../components/validation-run-details/ValidationStage';
import { formatDuration, formatTimestamp } from '../components/validation-run-details/utils';

interface LoadingStateProps {
  onBack: () => void;
}

function LoadingState({ onBack }: LoadingStateProps): JSX.Element {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analytics
        </Button>
      </div>
      <div className="text-center py-12">
        <Activity className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-600">Loading validation run details...</p>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  onBack: () => void;
}

function ErrorState({ onBack }: ErrorStateProps): JSX.Element {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analytics
        </Button>
      </div>
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Session Not Found
        </h3>
        <p className="text-gray-600">
          The validation run details could not be loaded.
        </p>
      </div>
    </div>
  );
}

interface SessionOverviewProps {
  session: SessionMetrics;
}

interface SessionInfoProps {
  session: SessionMetrics;
}

function SessionInfo({ session }: SessionInfoProps): JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {session.finalSuccess ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <h3 className="text-lg font-semibold text-gray-900">
          {session.userPrompt || 'Development Session'}
        </h3>
      </div>
      {session.taskDescription && (
        <p className="text-gray-600 mb-2">{session.taskDescription}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {formatTimestamp(session.startTime)}
        </div>
        {session.totalDuration && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(session.totalDuration)}
          </div>
        )}
        <div className="flex items-center gap-1">
          <Play className="h-4 w-4" />
          {session.attempts.length} attempts
        </div>
      </div>
    </div>
  );
}

function SessionOverview({ session }: SessionOverviewProps): JSX.Element {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <SessionInfo session={session} />
        <div className="text-right">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            session.finalSuccess 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {session.finalSuccess ? 'Success' : 'Failed'}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ValidationAttemptProps {
  attempt: ValidationAttemptMetrics;
}


function ValidationAttempt({ attempt }: ValidationAttemptProps): JSX.Element {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {attempt.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <h4 className="font-medium text-gray-900">
              Attempt #{attempt.attempt}
            </h4>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{formatTimestamp(attempt.startTime)}</span>
            <span>{formatDuration(attempt.totalTime)}</span>
            <span>{attempt.totalStages} stages</span>
          </div>
        </div>
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          attempt.success 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {attempt.success ? 'Success' : 'Failed'}
        </div>
      </div>

      <div className="space-y-2">
        <h5 className="font-medium text-gray-900 mb-2">Validation Stages:</h5>
        {attempt.stages.map((stage, stageIndex) => (
          <ValidationStage key={stageIndex} stage={stage} />
        ))}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  sessionId: string | undefined;
  onBack: () => void;
}

function PageHeader({ sessionId, onBack }: PageHeaderProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Button variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Analytics
      </Button>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Validation Run Details
        </h2>
        <p className="text-gray-600">Session {sessionId}</p>
      </div>
    </div>
  );
}

interface AttemptsListProps {
  attempts: ValidationAttemptMetrics[];
}

function AttemptsList({ attempts }: AttemptsListProps): JSX.Element {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Validation Attempts ({attempts.length})
      </h3>
      
      {attempts.map((attempt, attemptIndex) => (
        <ValidationAttempt 
          key={attemptIndex} 
          attempt={attempt} 
        />
      ))}
    </div>
  );
}

export function ValidationRunDetailsPage(): JSX.Element {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const {
    data: session,
    isLoading,
    error,
  } = useQuery<SessionMetrics>({
    queryKey: ['session', sessionId],
    queryFn: () => api.getSession(sessionId!),
    staleTime: QUERY_CONFIG.defaultStaleTime,
    enabled: !!sessionId,
  });

  const handleBack = (): void => navigate('/analytics');

  if (isLoading) {
    return <LoadingState onBack={handleBack} />;
  }

  if (error || !session) {
    return <ErrorState onBack={handleBack} />;
  }

  return (
    <div className="p-6">
      <PageHeader sessionId={sessionId} onBack={handleBack} />
      <SessionOverview session={session} />
      <AttemptsList attempts={session.attempts} />
    </div>
  );
}