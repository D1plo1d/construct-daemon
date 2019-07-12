import { makeStyles } from '@material-ui/styles'

const useStyles = makeStyles(theme => ({
  root: {
    color: 'white',
  },
  header: {
    background: theme.palette.error.dark,
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  stack: {
    paddingTop: theme.spacing(2),
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    background: '#333',
    fontSize: '1rem',
    fontWeight: 'normal',
  },
}), { useTheme: true })

export default useStyles
