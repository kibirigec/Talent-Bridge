import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  CircleSlash,
  Briefcase,
  Search,
} from 'lucide-react';

interface StatusTextProps {
  status: string;
}

export function StatusText({ status }: StatusTextProps) {
  switch (status) {
    case 'Available':
    case 'Approved':
    case 'Completed':
    case 'Paid':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Placed':
    case 'Active':
    case 'Ongoing':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 whitespace-nowrap">
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Pending':
    case 'Ending soon':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Under Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Rejected':
    case 'Terminated':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <Ban className="h-3.5 w-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Inactive':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <CircleSlash className="h-3.5 w-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
  }
}
