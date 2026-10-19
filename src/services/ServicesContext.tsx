import React, { createContext, useContext } from 'react';
import { Services, services } from './container';

/** Mặc định là bộ service thật; test / storybook bọc `ServicesProvider` với bản giả. */
const ServicesContext = createContext<Services>(services);

export const ServicesProvider: React.FC<{ value: Services; children: React.ReactNode }> = ({ value, children }) => (
  <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
);

export const useServices = (): Services => useContext(ServicesContext);
