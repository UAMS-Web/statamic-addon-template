import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

// Every job in the workflows that run on a pull request carries the RUN_REMOTE_CI gate (#16), so a
// private repository switches remote CI off with a variable instead of deleting the workflows.
// A job added without it would bill Actions minutes on a private repository, so this fails then.
const GATE = "vars.RUN_REMOTE_CI != 'false'"
// The `CI` aggregate in ci.yml and the two reporter jobs in pr-body-checks.yml run `always()` so they
// report a failed needed job, and keep the gate beside it; this is the one other condition a job may carry.
const AGGREGATE_GATE = `always() && ${GATE}`
const ACCEPTED = [GATE, AGGREGATE_GATE]
const GATED_WORKFLOWS = ['ci.yml']
// The pull-request body checks are checked where the repository carries them. A workflow that is
// not there runs no job, and the two copies `pr-body-checks.yml` replaces stay listed while
// repositories move to it, so this passes on both sides of that sync. At least one must be present.
const BODY_CHECK_WORKFLOWS = ['pr-body-checks.yml', 'check-attribution-footer.yml', 'check-closing-keywords.yml']

/**
 * The path of a workflow file in this repository.
 *
 * @param {string} file The workflow's file name.
 * @returns {string} Its path under `.github/workflows/`.
 */
function workflowPath(file) {
    return join(import.meta.dirname, '..', '.github', 'workflows', file)
}

/**
 * The ids of the jobs in a workflow whose `if:` is neither the gate nor the aggregate's form of it.
 *
 * @param {string} source The workflow's YAML.
 * @returns {string[]} The job ids without the gate; empty when every job has it.
 */
export function ungatedJobs(source) {
    const jobs = parse(source)?.jobs
    if (jobs === null || typeof jobs !== 'object') {
        throw new Error('workflow has no jobs mapping')
    }

    return Object.entries(jobs)
        .filter(([, job]) => !ACCEPTED.includes(job?.if))
        .map(([id]) => id)
}

describe('the RUN_REMOTE_CI gate', () => {
    for (const file of GATED_WORKFLOWS) {
        it(`is on every job of ${file}`, () => {
            expect(ungatedJobs(readFileSync(workflowPath(file), 'utf8'))).toEqual([])
        })
    }

    for (const file of BODY_CHECK_WORKFLOWS) {
        it.skipIf(!existsSync(workflowPath(file)))(`is on every job of ${file}, where present`, () => {
            expect(ungatedJobs(readFileSync(workflowPath(file), 'utf8'))).toEqual([])
        })
    }

    it('finds at least one pull-request body workflow to check', () => {
        expect(BODY_CHECK_WORKFLOWS.filter((file) => existsSync(workflowPath(file)))).not.toEqual([])
    })

    it('names a job added without it', () => {
        const source = ['jobs:', '  gated:', `    if: ${GATE}`, '    runs-on: ubuntu-latest', '  added:', '    runs-on: ubuntu-latest', ''].join('\n')

        expect(ungatedJobs(source)).toEqual(['added'])
    })

    it('names a job whose condition is something else', () => {
        const source = ['jobs:', '  other:', "    if: github.event_name == 'push'", '    runs-on: ubuntu-latest', ''].join('\n')

        expect(ungatedJobs(source)).toEqual(['other'])
    })

    it('accepts the aggregate form, and names always() without the gate', () => {
        const source = ['jobs:', '  ci:', `    if: ${AGGREGATE_GATE}`, '    runs-on: ubuntu-latest', '  bare:', '    if: always()', '    runs-on: ubuntu-latest', ''].join('\n')

        expect(ungatedJobs(source)).toEqual(['bare'])
    })

    it('names a job whose gate sits inside an ||, which runs with the switch off', () => {
        const source = ['jobs:', '  either:', `    if: always() || ${GATE}`, '    runs-on: ubuntu-latest', ''].join('\n')

        expect(ungatedJobs(source)).toEqual(['either'])
    })

    it('refuses a workflow with no jobs, which would otherwise read as gated', () => {
        expect(() => ungatedJobs('name: empty\n')).toThrow('no jobs mapping')
    })
})
