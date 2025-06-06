from flask import Flask, render_template

app = Flask(
    __name__,
    static_url_path="",
    static_folder="static",
    template_folder="templates"
)


@app.route("/")
def index():
    return render_template("index.html")


app.run(debug=False, host="0.0.0.0", port=5000)
