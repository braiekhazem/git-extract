
import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch } from 'lucide-react';

interface BranchSelectorProps {
  branches: string[];
  currentBranch: string;
  onChange: (branch: string) => void;
  disabled?: boolean;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  currentBranch,
  onChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2">
      <GitBranch className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentBranch}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Branches</SelectLabel>
            {branches.map(branch => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default BranchSelector;
