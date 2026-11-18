import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_TABS, getActiveTabIndex } from './segmented-nav.config.js';
import { SegmentedTabs } from './SegmentedTabs.js';

export const SegmentedNavbarTabs: React.FC<{ className?: string }> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeIndex = getActiveTabIndex(location.pathname);
  const activeId = activeIndex >= 0 ? NAV_TABS[activeIndex].id : '';

  return (
    <SegmentedTabs
      tabs={NAV_TABS}
      activeId={activeId}
      ariaLabel="Điều hướng chính"
      className={className}
      onChange={(_, index) => {
        if (NAV_TABS[index]) {
          navigate(NAV_TABS[index].to);
        }
      }}
    />
  );
};
