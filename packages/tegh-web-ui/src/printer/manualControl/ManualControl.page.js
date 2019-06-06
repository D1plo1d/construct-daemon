import React from 'react'
import { compose, withProps } from 'recompose'
import {
  Grid,
  Typography,
} from '@material-ui/core'
import Loader from 'react-loader-advanced'
import gql from 'graphql-tag'

import withLiveData from '../common/higherOrderComponents/withLiveData'

import PrinterStatusGraphQL from '../common/PrinterStatus.graphql.js'

import Home from './home/Home'
import MotorsEnabled from './MotorsEnabled'
import XYJogButtons from './jog/XYJogButtons'
import ZJogButtons from './jog/ZJogButtons'
import ComponentControl, { ComponentControlFragment } from './printerComponents/ComponentControl'

const MANUAL_CONTROL_SUBSCRIPTION = gql`
  subscription ManualControlSubscription($printerID: ID!) {
    live {
      patch { op, path, from, value }
      query {
        singularPrinter: printers(printerID: $printerID) {
          ...PrinterStatus
          motorsEnabled
          components {
            ...ComponentControlFragment
          }
        }
      }
    }
  }

  # fragments
  ${PrinterStatusGraphQL}
  ${ComponentControlFragment}
`

const enhance = compose(
  withProps(ownProps => ({
    subscription: MANUAL_CONTROL_SUBSCRIPTION,
    variables: {
      printerID: ownProps.match.params.printerID,
    },
  })),
  withLiveData,
  withProps(({ singularPrinter }) => ({
    printer: singularPrinter[0],
    isReady: singularPrinter[0].status === 'READY',
  })),
)

const ManualControl = ({ printer, isReady }) => (
  <div style={{ paddingLeft: 16, paddingRight: 16 }}>
    <main>
      <Loader
        show={!isReady}
        message={(
          <Typography variant="h4" style={{ color: '#fff' }}>
            manual controls disabled while
            {' '}
            {printer.status.toLowerCase()}
          </Typography>
        )}
        style={{
          flex: 1,
          margin: 0,
        }}
        backgroundStyle={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}
        contentStyle={{
          display: 'flex',
          flexWrap: 'wrap',
        }}
      >
        <Grid
          container
          spacing={2}
          style={{ marginTop: 16, marginBottom: 16 }}
        >
          <Grid item xs={12} lg={6}>
            <Home printer={printer} />
          </Grid>
          <Grid item xs={12} lg={6}>
            <MotorsEnabled printer={printer} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <XYJogButtons printer={printer} form="xyJog" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <ZJogButtons printer={printer} form="zJog" />
          </Grid>
        </Grid>
      </Loader>
      <Grid
        container
        spacing={2}
      >
        {
          printer.components
            .filter(c => ['BUILD_PLATFORM', 'TOOLHEAD', 'FAN'].includes(c.type))
            .map(component => (
              <Grid item xs={12} key={component.id}>
                <ComponentControl
                  printer={printer}
                  component={component}
                  disabled={!isReady}
                />
              </Grid>
            ))
        }
      </Grid>
    </main>
  </div>
)

export default enhance(ManualControl)
