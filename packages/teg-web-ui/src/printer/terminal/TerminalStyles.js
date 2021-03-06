import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    padding: theme.spacing(2),
  },
  reference: {
    flexGrow: 0,
  },
  terminalHistory: {
    flexGrow: 1,
    marginTop: theme.spacing(2),
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'scroll',
  },
  inputRow: {
    display: 'flex',
    width: '100%',
  },
  input: {
    flexGrow: 1,
    marginRight: theme.spacing(2),
  },
  tx: {
    '& $direction': {
      color: '#DD25C4',
    },
    background: '#EEE',
  },
  rx: {
    '& $direction': {
      color: theme.palette.primary.dark,
    },
  },
  direction: {
    marginRight: theme.spacing(1),
  },
  createdAt: {
    color: '#666',
  },
  message: {
  },
}))

export default useStyles
