import express, { Request, Response, Router } from 'express'
import { exec } from 'child_process'
import { get } from 'env-var'

const app = express()
const apiRouter = Router()
const port = get('PORT').required().asPortNumber()
const token = get('TOKEN').required().asString()
const pathScripts = get('PATH_SCRIPTS').required().asString()
const prefix = get('PREFIX').required().asString()

app.use(express.json())

apiRouter.post('/', (req: Request, res: Response) => {
	try {
		console.log('¡Webhook recibido!')

		if (!req.query.token) {
			res.status(403).send('No se envió el token')
			return
		}

		if (req.query.token !== token) {
			res.status(403).send('Token inválido')
			return
		}

		const { push_data, repository } = req.body

		if (!push_data || !repository) {
			res.status(400).send('Petición incorrecta (faltan datos importantes)')
			return
		}

		if (push_data.tag !== 'latest') {
			res.status(400).send('Petición incorrecta (tag no es "latest")')
			return
		}

		const script = repository.name

		if (!/^[a-zA-Z0-9_-]+$/.test(script)) {
			res.status(400).send('Nombre de script inválido')
			return
		}

		const scriptPath = `${pathScripts}/${script}.sh`
		console.log(`Ejecutando script: ${scriptPath}`)

		exec(scriptPath, (error, stdout, stderr) => {
			if (error) {
				console.error(`Error ejecutando el script: ${error.message}`)
				return res.status(500).send(`Error ejecutando el script: ${error.message}`)
			}
			if (stderr) {
				console.error(`stderr: ${stderr}`)
				return res.status(500).send(`stderr: ${stderr}`)
			}
			console.log(`stdout: ${stdout}`)
			return res.status(200).send('Webhook procesado y script ejecutado con éxito')
		})

	} catch (error) {
		console.error(error)
		res.status(500).send((error as Error).message)
	}
})

app.use(`/api/${prefix}`, apiRouter)

app.listen(port, () => {
	console.log(`Servidor escuchando en puerto ${port}`)
})
