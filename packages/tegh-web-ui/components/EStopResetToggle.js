import { graphql } from 'react-apollo'
import gql from 'graphql-tag'
import { compose, lifecycle } from 'recompose'
import styled from 'styled-components'
import {
  Card,
  CardContent,
  Grid,
  IconButton,
  Typography,
  CardHeader,
  Switch,
  FormControlLabel,
  Button,
  withStyles,
} from 'material-ui'
import {
  Report
} from 'material-ui-icons'
import { Field, reduxForm, formValues } from 'redux-form'

import withSpoolMacro from '../higherOrderComponents/withSpoolMacro'

const styles = theme => ({
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
})


const enhance = compose(
  withSpoolMacro,
  withStyles(styles),
)

const statusColor = status => {
  switch(status) {
    case 'READY':
    case 'PRINTING':
      return '#1B5E20'
    case 'ERRORED':
    case 'ESTOPPED':
      return '#D50000'
    default:
      return '#FF5722'
  }
}

const EStopResetToggle = ({
  printer,
  spoolMacro,
  classes,
}) => {
  const { status, error } = printer
  const showEstop = status !== 'ERRORED' && status !== 'ESTOPPED'
  const disabled = status === 'DISCONNECTED'
  const onClick = () => {
    spoolMacro({ macro: showEstop ? 'eStop' : 'reset' })
  }

  return (
    <div>
      <div style={{display: 'inline-block', paddingTop: 8}}>
        <Typography variant='button'>
          <span style={{ color: statusColor(status), marginRight: 10 }}>
            { status }
          </span>
        </Typography>
      </div>
      <div style={{display: 'inline-block'}}>
        <Button
          color={showEstop ? 'secondary' : 'primary'}
          variant="raised"
          disabled={disabled}
          onClick={onClick}
        >
          {
            showEstop &&
            <Report className={classes.leftIcon}/>
          }
          {showEstop ? 'EStop' : 'Reset'}
        </Button>
      </div>
    </div>
  )
}

export default enhance(EStopResetToggle)
