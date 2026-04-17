from app.main import app, parse_args

import uvicorn


if __name__ == "__main__":
    args = parse_args()
    uvicorn.run("app.main:app", host=args.host, port=args.port, reload=args.reload)
