// Windows: the .exe gets the VXH icon and version info (app.rc). Nothing to do on other systems.
fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        embed_resource::compile("app.rc", embed_resource::NONE).manifest_optional().ok();
    }
}
