import { env } from "node:process"
import assert from "node:assert"
import { info, warning } from "@actions/core"
import { exec } from "@actions/exec"
import process from "process"

const nexssOS = require("@nexssp/os")

class Prepare_os {
	os: any
	_clean_env?: { [key: string]: string }

	constructor() {
		this.os = nexssOS()
	}

	public get dependencies(): string[] {
		let have_beakerlib = false
		const with_python_action = "pythonLocation" in process.env
		let dependencies = ["rsync"]

		// Check OS
		switch (this.os.name()) {
			case this.os.distros.FEDORA:
			case this.os.distros.CENTOS:
			case this.os.distros.RHEL:
				have_beakerlib = true
				break
			case this.os.distros.UBUNTU:
			case this.os.distros.DEBIAN:
				break
			default:
				info(
					`Unsupported platform "${this.os.name()}". Dependency installation may fail`,
				)
				break
		}
		if (!with_python_action) dependencies.push("python3-pip")

		// Install missing dependencies
		if (this.os.name() == this.os.distros.FEDORA) dependencies.push("dnf5")
		if (have_beakerlib) {
			dependencies.push("beakerlib")
		} else {
			warning(
				"Beakerlib is not available. Tmt jobs may fail if it requires it.",
			)
		}
		return dependencies
	}

	get clean_env(): { [key: string]: string } {
		// Running `dnf` with setup-python can clash. During these steps, we are
		// sanitizing the environment variables
		if (this._clean_env === undefined) {
			let clean_env: { [key: string]: string } = {}
			for (const [key, value] of Object.entries(env)) {
				if (/(LD_LIBRARY_PATH|Python\d?_ROOT_DIR)/.test(key)) continue
				assert(value != undefined)
				clean_env[key] = value
			}
			this._clean_env = clean_env
		}
		return this._clean_env
	}

	public async install(dependencies?: string[]): Promise<number> {
		if (dependencies == undefined) dependencies = this.dependencies
		if (/apt/.test(this.os.getPM("update")))
			await exec(`${this.os.sudo()}${this.os.getPM("update")}`, undefined, {
				env: this.clean_env,
			})
		return exec(
			`${this.os.sudo()}${this.os.getPM("install")} ${dependencies.join(" ")}`,
			undefined,
			{ env: this.clean_env },
		)
	}
}

export { Prepare_os }
