import * as core from '@actions/core'
import * as jp from 'jsonpath'
import { readFileSync, writeFile } from 'fs'
import { basename, join } from 'path'

import { ConfigOptions, JsonMode } from '../typings/types'

import { deserialize, ensureDirExists, isBlankString, serialize } from './utils'
import { getType, isArray } from './validators'
import { valueError } from './errors'
import { Comparator, compareBy, compareByPropertyKey, compareIgnoreCase } from './comparators'

const getFilter = <T>(jsonMode: JsonMode) => (a: T, b: T): boolean =>
    jsonMode === JsonMode.unique ? a === b : a !== b

const getComparator = (fields: PropertyKey[]): Comparator<any> => {
    const comparators = fields.map(field =>
        compareByPropertyKey(field, (a: string, b: string) => compareIgnoreCase(a, b))
    )

    return compareBy(...comparators)
}

const getJsonData = (fileName: string): ConfigOptions[] => {
    const fileData = readFileSync(fileName)

    return deserialize(fileData.toString())
}

const processSourceFile = async (
    fileName: string,
    jsonMode: JsonMode,
    jsonPath: string,
    fields: PropertyKey[]
): Promise<any> => {
    const filterMode = getFilter(jsonMode)
    const comparator = getComparator(fields)
    const jsonData = getJsonData(fileName)

    const propertyData = jp.query(jsonData, jsonPath)

    if (!isArray(propertyData)) {
        throw valueError(
            `Invalid data type: ${getType(propertyData)} for property: ${jsonPath}, should be an array`
        )
    }

    const parentPath = jp.stringify(jp.parse(jsonPath).slice(0, -1))
    const filteredData = propertyData.filter((item, index, self) =>
        filterMode(
            index,
            self.findIndex(value => comparator(value, item) === 0)
        )
    )

    jp.value(jsonData, parentPath, filteredData)

    return jsonData
}

const storeJsonData = async (filePath: string, fileName: string, data: any): Promise<boolean> => {
    ensureDirExists(filePath)

    const targetPath = join(filePath, fileName)

    core.info(`Storing JSON data to target file: ${targetPath}`)

    writeFile(targetPath, serialize(data), err => {
        if (err) {
            throw err
        }
    })

    return true
}

const processConfigOptions = async (options: Required<ConfigOptions>): Promise<boolean> => {
    core.info(
        `Processing source JSON file: ${options.sourceFile} with mode: ${options.jsonMode}, path: ${options.jsonPath}, fields: ${options.jsonFields}`
    )

    const jsonData = await processSourceFile(
        options.sourceFile,
        options.jsonMode,
        options.jsonPath,
        options.jsonFields
    )
    return await storeJsonData(options.targetPath, options.targetFile, jsonData)
}

const getConfigOptions = (options: any = {}): Required<ConfigOptions> => {
    const sourceFile = options.sourceFile || core.getInput('sourceFile', { required: true })
    const targetPath = options.targetPath || core.getInput('targetPath', { required: true })
    const targetFile = options.targetFile || core.getInput('targetFile') || basename(sourceFile)

    const mode = options.mode || core.getInput('mode', { required: true })

    const jsonMode = JsonMode[mode]
    const jsonPath = options.jsonPath || core.getInput('jsonPath', { required: true })
    const jsonFields = (options.jsonFields || core.getInput('jsonFields', { required: true })).split(',')

    return {
        sourceFile,
        targetPath,
        targetFile,
        jsonMode,
        jsonPath,
        jsonFields,
    }
}

const processData = async (...options: ConfigOptions[]): Promise<void> => {
    let status = false

    for (const item of options) {
        const options = getConfigOptions(item)
        status = await processConfigOptions(options)
    }

    core.setOutput('changed', status)
}

export default async function run(): Promise<void> {
    try {
        const sourceData = core.getInput('sourceData')

        if (!isBlankString(sourceData)) {
            const options = getJsonData(sourceData)
            await processData(...options)
        } else {
            await processData({})
        }
    } catch (e) {
        core.setFailed(`Cannot process JSON data, message: ${e.message}`)
    }
}

run()
