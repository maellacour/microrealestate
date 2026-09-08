import { createTheme } from '@material-ui/core/styles';

// Bayle — align the legacy MUI palette with the shadcn tokens (globals.css)
const backgroundColor = '#edece6'; // pierre
const whiteColor = '#FBFAF6'; // warm white
const primaryColor = '#2d5c4a'; // pine
const successColor = '#2f7d55';
const warningColor = '#a9803a'; // brass
const defaultColor = '#1c201c'; // ink

// Create a theme instance.
const theme = createTheme({
  palette: {
    primary: {
      main: primaryColor,
      contrastText: whiteColor
    },
    success: {
      main: successColor,
      contrastText: whiteColor
    },
    warning: {
      main: warningColor,
      contrastText: whiteColor
    },
    background: {
      paper: whiteColor,
      default: backgroundColor
    }
  },
  overrides: {
    MuiAppBar: {
      colorPrimary: {
        color: defaultColor,
        backgroundColor: whiteColor
      }
    },
    MuiInputAdornment: {
      root: {
        color: defaultColor
      }
    },
    MuiButton: {
      root: {
        color: defaultColor
      },
      containedPrimary: {
        color: whiteColor,
        '&.Mui-selected': {
          backgroundColor: primaryColor
        }
      }
    },
    MuiInput: {
      root: {
        color: defaultColor
      }
    },
    MuiStepIcon: {
      root: {
        '&$completed': {
          color: successColor
        }
      }
    },
    MuiTabs: {
      indicator: {
        backgroundColor: primaryColor
      }
    }
  }
});

export default theme;
