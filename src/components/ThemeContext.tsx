import * as React from 'react';

type ITheme = {
  button: {
    primary: {
      backgroundColor: string;
      color: string;
      borderRadius: number;
      height: number;
      fontSize: number;
    };
  };

  fontSize: { md: number };

  sizes: { sm: number; md: number };

  padding: { md: number };
};

const sizes = { sm: 8, md: 16 };

const fontSize = { md: 14 };

const DefaultTheme: ITheme = {
  button: {
    primary: {
      backgroundColor: '#908DFF',
      color: 'white',
      borderRadius: 4,
      height: 41,
      fontSize: fontSize.md,
    },
  },

  sizes,

  fontSize,

  padding: { md: sizes.md },
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
