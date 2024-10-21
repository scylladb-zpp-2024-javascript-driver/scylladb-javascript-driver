import * as graphModule from "./graph";
import * as searchModule from "./search";

export namespace datastax {
  export import graph = graphModule.graph;

  export import search = searchModule.search;
}
