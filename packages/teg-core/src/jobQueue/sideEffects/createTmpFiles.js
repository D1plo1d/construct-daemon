import { List } from 'immutable'
import Promise from 'bluebird'
import tmp from 'tmp-promise'

import fs from 'fs'
import JobFile from '../types/JobFile'

const writeFileAsync = Promise.promisify(fs.writeFile)

const createTmpFiles = async ({ onCreate, job, files }) => {
  // console.log({ files })
  const jobFiles = await Promise.all(
    files.map(async (file) => {
      if (typeof file.name !== 'string') {
        throw new Error('file name must be a string')
      }

      const tmpFile = await tmp.file()
      const filePath = tmpFile.path

      await writeFileAsync(filePath, file.commands.join('\n'))

      return JobFile({
        jobID: job.id,
        name: file.name,
        filePath,
        isTmpFile: true,
        quantity: 1,
        annotations: file.annotations,
        totalLines: file.commands.length,
      })
    }),
  )

  return {
    onCreate,
    job,
    jobFiles: List(jobFiles).toMap().mapKeys((index, jobFile) => jobFile.id),
  }
}

export default createTmpFiles
