import { getInput, startGroup, endGroup, info, setFailed } from "@actions/core"
import dedent from "dedent"

import { Prepare_os } from "../tmt/prepare_os"
import { Tmt } from "../tmt/tmt"

async function run(): Promise<void> {
	const prepare_os = new Prepare_os()
	const tmt = new Tmt()

	// Prepare OS dependencies
	startGroup("Install system dependencies")
	return prepare_os
		.install()
		.then(async () => {
			// install packit
			endGroup()
			startGroup("Setup tmt")
			const tmt_version = getInput("tmt-version")
			return tmt.install(tmt_version)
		})
		.then(async (res) => {
			// Display information
			endGroup()
			startGroup("tmt info")
			info(
				dedent`
                tmt-version: ${await tmt.version}
                `,
			)
			endGroup()
		})
}

run().catch((err) => setFailed(`Action failed:\n${err}`))
