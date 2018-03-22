import Promise from 'bluebird'

import { graphql } from 'react-apollo'
import gql from 'graphql-tag'

const createJobGraphQL = gql`
  mutation createJob($input: CreateJobInput!) {
    createJob(input: $input) {
      id
    }
  }
`

const addJobHandler = graphql(createJobGraphQL, {
  props: ({ mutate }) => ({
    addJob: async (value) => {
      console.log('print??111')

      const mutationInput = {
        printerID: "test_printer_id",
        name: value.map(f => f.name).join(', '),
        files: [],
      }

      for (const file of value) {
        const { name } = file

        /* read the file */
        const fileReader = new FileReader()
        fileReader.readAsText(file)
        await new Promise(resolve => fileReader.onload = resolve)

        mutationInput.files.push({
          name,
          content: fileReader.result
        })
      }
      /* execute the mutation */
      console.log(mutationInput)
      mutate({
        variables: {
          input: mutationInput
        }
      })
    },
  }),
})


export default addJobHandler
