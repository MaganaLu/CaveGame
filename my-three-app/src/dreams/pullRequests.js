// CRUD Reviews content (Dream Sprint): pull requests to ship or block. `answer` is
// 'approve' or 'request'; `catastrophic` ones would blow up production.
// Text: content/dreams/pull-requests.json
import PR_TEXT from '../content/dreams/pull-requests.json'

export const PULL_REQUESTS = PR_TEXT.pullRequests
// File shown in the "Files changed" header, by PR title
export const fileFor = (pr) => PR_TEXT.files[pr.title] ?? 'src/index.js'
export const APPROVE_LINES = PR_TEXT.approveLines
export const REQUEST_LINES = PR_TEXT.requestLines
export const WRONG_LINES = PR_TEXT.wrongLines
