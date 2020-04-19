import * as React from 'react';

type ITheme = {
  button: {
    primary: {
      backgroundColor: string;
      color: string;
      borderRadius: number;
      height: number;
      fontSize: { md: number; lg: number };
    };
  };

  fontSize: { md: number; lg: number; xl: number };

  sizes: { sm: number; md: number };

  padding: { md: number };

  color: {
    background: string;
  };
};

const sizes = { sm: 8, md: 16 };

const fontSize = { md: 14, lg: 16, xl: 32 };

const color = { background: '#151B2E' };

const DefaultTheme: ITheme = {
  button: {
    primary: {
      backgroundColor: '#908DFF',
      color: 'white',
      borderRadius: 4,
      height: 41,
      fontSize,
    },
  },

  sizes,

  fontSize,

  padding: { md: sizes.md },

  color,
};

export const ThemeContext = React.createContext<ITheme>(DefaultTheme);

export function ThemeContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={DefaultTheme}>
      {children}
    </ThemeContext.Provider>
  );
}
