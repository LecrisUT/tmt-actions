import {
	getInput,
	startGroup,
	endGroup,
	info,
	error,
	isDebug,
} from "@actions/core"
import { Tmt } from "../tmt/tmt"
import dedent from "dedent"
import { DefaultArtifactClient } from "@actions/artifact"

const artifact = new DefaultArtifactClient()

async function run(): Promise<void> {
	// Get the `context` input
	let context = JSON.parse(getInput("context"))
	if (typeof context != "object" || context == null)
		error(`Input "context" is not a JSON object:\n${context}`)
	for (const [key, val] of Object.entries(context))
		if (typeof val != "string")
			error(`Context key "${key}" has a non-string value: ${val}`)
	// Add github initiator to the context if one was not defined
	if (!("initiator" in context)) context["initiator"] = "github"

	// Get other inputs
	const root = getInput("root")
	const report_xml = getInput("report-xml")
	const report_artifact = getInput("report-artifact")

	const tmt = new Tmt(context)

	// Check that tmt is executable
	startGroup("tmt version")
	info(
		dedent`
		tmt-version: ${await tmt.version}
		`,
	)
	endGroup()

	// Print all the tmt plans
	startGroup("tmt plans")
	await tmt.plans_ls(root)
	endGroup()

	// More debug introspection
	if (isDebug()) {
		startGroup("tmt plans (show)")
		await tmt.plans_show(root)
		endGroup()
	}

	// Actual tmt execution
	startGroup("tmt run")
	await tmt.plans_run(report_xml, root, isDebug())
	await artifact.uploadArtifact(report_artifact, [report_xml], ".")
	endGroup()
}

run()
