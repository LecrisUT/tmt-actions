import { exec, getExecOutput } from "@actions/exec"
import assert from "node:assert"

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
		await exec("tmt", [
			...base_args,
			"run",
			"--all",
			...provision_args,
			...report_args,
		])
	}
}

export { Tmt }
