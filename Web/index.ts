import { opine, serveStatic, text } from "https://deno.land/x/opine@2.3.3/mod.ts";
import { open } from "https://deno.land/x/opener/mod.ts";

const app = opine();

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

async function executeShellCommand(req, res, command: string) {
    const cmd = [
        "powershell",
        "/c"
    ];

    if (command == "compile") {
        cmd.push("cd ../PlatformIO; pio run --environment ATmega328P");
    } else if (command == "flash") {
        cmd.push("cd ../PlatformIO; pio run --target upload");
    }

    const p = Deno.run({
        cmd,
        stdout: "piped",
        stderr: "piped",
    });

    const { code } = await p.status();

    // Reading the outputs closes their pipes
    const rawOutput = await p.output();
    const rawError = await p.stderrOutput();

    p.close();

    if (code === 0) {
        res.json({
            status: true,
            data: textDecoder.decode(rawOutput)
        });
    } else {
        res.json({
            status: false,
            data: textDecoder.decode(rawError)
        });
    }
}

app.post("/compile", text(), async (req, res) => {
    await Deno.writeFile(`${Deno.cwd().replaceAll("\\", "/")}/../PlatformIO/include/Pixelator.h`, textEncoder.encode(req.parsedBody));
    await executeShellCommand(req, res, "compile");
});

app.get("/flash", async (req, res) => {
    await executeShellCommand(req, res, "flash");
});

app.use(serveStatic("public"));

app.get("/", (req, res) => {
    res.sendFile(`${Deno.cwd().replaceAll("\\", "/")}/public/pixelator.html`);
});

app.listen(8080, () => {
        console.log({
            component: "Server",
            status: true,
            port: 8080,
            cwd: Deno.cwd()
        });
        open("http://localhost:8080");
    }
);
