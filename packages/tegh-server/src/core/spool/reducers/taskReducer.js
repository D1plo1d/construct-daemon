import { merge, Record, List, Map } from 'immutable'

import { DELETE_ITEM } from '../../util/ReduxNestedMap'
import { priorityOrder } from '../types/PriorityEnum'
import {
  isSpooled,
  SPOOLED,
  PRINTING,
  ERRORED,
  CANCELLED,
  DONE,
} from '../types/TaskStatusEnum'

/* printer actions */
import { PRINTER_READY } from '../../printer/actions/printerReady'
import { ESTOP } from '../../printer/actions/estop'
import { DRIVER_ERROR } from '../../printer/actions/driverError'
/* job actions */
import { CANCEL_JOB } from '../../jobQueue/actions/cancelJob'
import { DELETE_JOB } from '../../jobQueue/actions/deleteJob'
/* task actions */
import { SPOOL_TASK } from '../actions/spoolTask'
import { DESPOOL_TASK } from '../actions/despoolTask'
import { CREATE_TASK } from '../actions/createTask'
import { DELETE_TASK } from '../actions/deleteTask'
import { START_TASK } from '../actions/startTask'

const taskReducer = (state, action) => {
  switch (action.type) {
    /* Spool reset actions */
    case PRINTER_READY:
    case ESTOP:
    case DRIVER_ERROR: {
      if (isSpooled(state.status)) {
        const isError = action.type === DRIVER_ERROR
        const status = isError ? ERRORED : CANCELLED
        return state.set('status', status)
      }

      return state
    }
    case CANCEL_JOB: {
      const { id } = action.payload
      if (state.jobID !== id) return state

      return state.set('status', CANCELLED)
    }
    case DELETE_JOB: {
      const { id } = action.payload

      return state.jobID === id ? DELETE_ITEM : state
    }
    case CREATE_TASK: {
      return action.payload.task
    }
    case DELETE_TASK: {
      const { id } = action.payload

      return state.id === id ? DELETE_ITEM : state
    }
    case SPOOL_TASK: {
      const { task } = action.payload
      let nextState = state

      if (!priorityOrder.includes(task.priority)) {
        throw new Error(`Invalid priority ${task.priority}`)
      }

      if (
        task.id !== state.id
        && task.priority === 'emergency'
        && isSpooled(state.status)
      ) {
        /*
         * Emergency tasks cancel and pre-empt queued and printing tasks
         */
         nextState = nextState.set('status', CANCELLED)
      }
      return nextState
    }
    case START_TASK: {
      return state.merge({
        startedAt: new Date().toISOString(),
        status: PRINTING,
        currentLineNumber: 0,
      })
    }
    case DESPOOL_TASK: {
      if (state.currentLineNumber < state.data.size - 1) {
        /*
         * if the task has more lines to execute then increment the line number
         */
        return state.update('currentLineNumber', i => i + 1)
      }
      /* mark tasks as done after they are completed */
      return state.merge({
        // TODO: stoppedAt should eventually be changed to be sent after
        // the printer sends 'ok' or 'error' and should be based off
        // estimated print time
        stoppedAt: new Date().toISOString(),
        status: DONE,
        /* the data of each completed task is deleted to save space */
        data: null,
      })
    }
    default: {
      return state
    }
  }
}

export default taskReducer