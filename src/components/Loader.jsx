import { Dimmer, Loader, Icon, IconGroup, Segment } from "semantic-ui-react";

const LoaderExampleLoader = (prop) => {
    return(<Segment basic className="myloading">
        <Dimmer active>
            {prop.errcon ? (
                <div>
                    <IconGroup size="huge" style={{ marginTop: "10%" }}>
                        <Icon color="grey" name="internet explorer" inverted />
                        <Icon size="big" color="red" name="dont" />
                    </IconGroup>
                    <br />
                    <br />
                    <br />
                    <br />
                    Connection Error!
                </div>
            ) : (
                <Loader size="huge" />
            )}
        </Dimmer>
    </Segment>)};

export default LoaderExampleLoader;
