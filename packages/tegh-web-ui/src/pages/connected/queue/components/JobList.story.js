
import React from 'react'
import { storiesOf } from '@storybook/react'
import { Component as JobList } from './JobList'

import {
  drinkingGlass,
  gear,
  reprap,
  robot,
} from '../mocks/job.mock'

storiesOf('JobList', module)
  .add('with jobs', () => {
    const props = {
      jobs: [
        drinkingGlass,
        reprap,
        gear,
        robot,
      ],
      status: 'READY',
    }
    return <JobList {...props} />
  })
