import { exec, getExecOutput } from "@actions/exec"
import assert from "node:assert"

class Tmt {
	_version?: string

	public async install(version?: string) {
		// Do actual tmt install
		return exec(`python3 -m pip install tmt[report-junit]${version}`)
	}

	public get version(): Promise<string> {
		return (async () => {
			if (this._version === undefined) {
				const out = await getExecOutput("tmt --version")
				this._version = out.stdout
			}
			assert(this._version !== undefined)
			return this._version
		})()
	}
}

export { Tmt }
