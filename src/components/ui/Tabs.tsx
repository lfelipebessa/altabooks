import React, { createContext, useContext, useId } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (v: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs.* must be used inside <Tabs>');
  return ctx;
}

interface TabsRootProps {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}

const TabsRoot: React.FC<TabsRootProps> = ({ value, onValueChange, children }) => {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return (
    <div
      role="tablist"
      className={`flex gap-1 border-b border-gray-200 ${className ?? ''}`.trim()}
    >
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

const TabsTrigger: React.FC<TabsTriggerProps> = ({ value: triggerValue, children }) => {
  const { value, onValueChange, baseId } = useTabs();
  const isActive = value === triggerValue;
  const triggerId = `${baseId}-trigger-${triggerValue}`;
  const panelId = `${baseId}-panel-${triggerValue}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const list = (e.currentTarget.parentElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const arr = Array.from(list);
    const values = arr.map(el => el.dataset.value ?? '');
    const i = values.indexOf(triggerValue);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % arr.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + arr.length) % arr.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = arr.length - 1;
    onValueChange(values[next]);
    arr[next].focus();
  };

  return (
    <button
      type="button"
      role="tab"
      id={triggerId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      data-value={triggerValue}
      onClick={() => onValueChange(triggerValue)}
      onKeyDown={handleKeyDown}
      className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px cursor-pointer ${
        isActive
          ? 'text-brand-text-main border-brand-primary font-semibold'
          : 'text-gray-500 hover:text-brand-text-main border-transparent'
      }`}
    >
      {children}
    </button>
  );
};

interface TabsPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const TabsPanel: React.FC<TabsPanelProps> = ({ value: panelValue, children, className }) => {
  const { value, baseId } = useTabs();
  if (value !== panelValue) return null;
  const triggerId = `${baseId}-trigger-${panelValue}`;
  const panelId = `${baseId}-panel-${panelValue}`;
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={triggerId}
      className={`pt-4 ${className ?? ''}`.trim()}
    >
      {children}
    </div>
  );
};

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
});
