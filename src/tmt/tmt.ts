import { exec, getExecOutput } from "@actions/exec"
import assert from "node:assert"
import { error, notice, setFailed, warning } from "@actions/core"

class Tmt {
	_version?: string
	context: { [key: string]: string } = {}

	constructor(context?: { [key: string]: string }) {
		if (context !== undefined) this.context = context
	}

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

	get context_args(): string[] {
		let args: string[] = []
		for (const [key, val] of Object.entries(this.context))
			args.push("--context", `${key}=${val}`)
		return args
	}

	public async plans_ls(root?: string) {
		let base_args = this.context_args
		if (root) base_args.push("--root", root)
		return exec("tmt", [...base_args, "plans", "ls"])
	}

	public async plans_show(root?: string) {
		let base_args = this.context_args
		if (root) base_args.push("--root", root)
		return exec("tmt", [...base_args, "plans", "show"])
	}

	public async plans_run(report_xml: string, root?: string, debug?: boolean) {
		let base_args = this.context_args
		if (root) base_args.push("--root", root)
		if (debug) base_args.push("-dd")

		// Must run as provision local
		const provision_args = ["provision", "--update", "--how", "local"]
		// Report is not parseable by default. Use JUnit output
		const report_args = ["report", "--how", "junit", "--file", report_xml]
		await exec(
			"tmt",
			[...base_args, "run", "--all", ...provision_args, ...report_args],
			{ ignoreReturnCode: true },
		).then((exit_code) => {
			switch (exit_code) {
				case 0:
					// Everything ran successfully. No need to do anything
					break
				case 1:
					// There was a failed or warning test. Report appropriate warning/error
					// TODO: Properly output warning and failed test counts
					setFailed("Tmt tests failed or raised a warning")
					break
				case 2:
					setFailed("Tmt execution encountered an error")
					break
				case 3:
					warning("No test results found")
					break
				case 4:
					notice("All tmt tests were skipped")
					break
				default:
					setFailed(`Tmt returned with unknown exit code: ${exit_code}`)
			}
		})
	}
}

export { Tmt }
