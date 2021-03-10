import React from 'react'
import { gql } from '@apollo/client'
import { useMutation, useQuery } from '@apollo/client'

import JobQueueView from './JobQueue.view'

import useLiveSubscription from '../_hooks/useLiveSubscription'

const PRINT_QUEUES_QUERY = gql`
  fragment QueryFragment on Query {
    machines(input: { machineID: $machineID }) {
      id
      status
    }
    latestPrints(input: { machineIDs: [$machineID] }) {
      id
      percentComplete(digits: 1)
      estimatedPrintTimeMillis
      startedAt
      stoppedAt
      status
      paused
      partID
      machine {
        id
        name
      }
    }
    printQueues(input: { machineID: $machineID }) {
      id
      name
      parts {
        id
        name
        quantity
        printsCompleted
        totalPrints
        startedFinalPrint
        # stoppedAt

        tasks {
          id
          percentComplete(digits: 1)
          estimatedPrintTimeMillis
          startedAt
          stoppedAt
          status
          paused
          machine {
            id
            name
          }
        }
      }
    }
  }
`

const STOP = gql`
  mutation stop($machineID: ID!) {
    stop(machineID: $machineID) { id }
  }
`

const SET_JOB_POSITION = gql`
  mutation setPartPosition($input: SetPartPositionInput!) {
    setPartPosition(input: $input) { id }
  }
`

const PRINT = gql`
  mutation print($input: PrintInput!) {
    print(input: $input) { id }
  }
`

const DELETE_PART = gql`
  mutation deletePart($input: DeletePartInput!) {
    deletePart(input: $input) { id }
  }
`

const JobQueuePage = ({
  match,
}) => {
  const { machineID } = match.params

  const { loading, data, error } = useLiveSubscription(PRINT_QUEUES_QUERY, {
    variablesDef: '($machineID: ID)',
    variables: {
      machineID,
    },
  })

  const [print] = useMutation(PRINT)
  const [deletePart] = useMutation(DELETE_PART)
  const [cancelTask] = useMutation(STOP)
  const [setPartPosition] = useMutation(SET_JOB_POSITION)
  const [pausePrint] = useMutation(gql`
    mutation pausePrint($taskID: ID!) {
      pausePrint(taskID: $taskID) { id }
    }
  `)
  const [resumePrint] = useMutation(gql`
    mutation resumePrint($taskID: ID!) {
      resumePrint(taskID: $taskID) { id }
    }
  `)

  const moveToTopOfQueue = ({ partID }) => setPartPosition({
    variables: {
      input: {
        partID,
        position: 0,
      },
    },
  })

  if (loading) {
    return <div />
  }

  if (error) {
    throw error
  }

  const {
    machines,
    printQueues,
    latestPrints,
  } = data

  const nextPart = printQueues
    .map(printQueue => printQueue.parts)
    .flat()
    .find(part => !part.startedFinalPrint)

  const readyMachine = machines.find(machine => (
    machine.status === 'READY'
  ))

  const spoolNextPrint = () => {
    if (nextPart == null) {
      throw new Error('nothing in the queue to print')
    }
    if (readyMachine == null) {
      throw new Error('No machine is ready to start a print')
    }

    print({
      variables: {
        input: {
          machineID: readyMachine.id,
          partID: nextPart.id,
        },
      },
    })
  }

  return (
    <JobQueueView
      {...{
        latestPrints,
        printQueues,
        machines,
        nextPart,
        spoolNextPrint,
        deletePart,
        cancelTask,
        pausePrint,
        resumePrint,
        moveToTopOfQueue,
      }}
    />
  )
}

export default JobQueuePage
