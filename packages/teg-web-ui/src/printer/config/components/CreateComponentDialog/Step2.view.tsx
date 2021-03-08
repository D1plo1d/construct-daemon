import React from 'react'

import DialogContent from '@material-ui/core/DialogContent'
import DialogActions from '@material-ui/core/DialogActions'
import Button from '@material-ui/core/Button'
import Stepper from '@material-ui/core/Stepper'
import Step from '@material-ui/core/Step'
import StepLabel from '@material-ui/core/StepLabel'

import ConfigForm from '../ConfigForm/ConfigForm'
import ConfigFields from '../ConfigForm/ConfigFields'

const STEPS = [
  'Select a Type',
  'Configure the Component',
]

const CreateComponentStep2 = ({
  configForm,
  mutation,
  wizard,
  onSubmit,
  onBack,
}) => {
  return (
    <ConfigForm {...{
      configForm,
      mutation,
      onSubmit,
    }} >
      <DialogContent style={{ minHeight: '12em' }}>
        <Stepper activeStep={wizard.activeStep}>
          {
            STEPS.map((label, index) => (
              <Step key={label} completed={index < wizard.activeStep}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))
          }
        </Stepper>
        <ConfigFields />
      </DialogContent>
      <DialogActions>
        <Button onClick={onBack}>
          Back
        </Button>
        <Button type="submit" color="primary">
          Finish
        </Button>
      </DialogActions>
    </ConfigForm>
  )
}

export default CreateComponentStep2
