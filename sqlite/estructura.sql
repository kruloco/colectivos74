CREATE TABLE "grupo"(
  "grupo_id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL CHECK("grupo_id">=0),
  "numero" INTEGER NOT NULL,
  "nombre" VARCHAR(100) NOT NULL
);
CREATE TABLE "linea"(
  "linea_id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL CHECK("linea_id">=0),
  "numero" VARCHAR(10) NOT NULL,
  "nombre" VARCHAR(100) NOT NULL
);
CREATE TABLE "linea_grupo"(
  "linea_id" INTEGER NOT NULL CHECK("linea_id">=0),
  "grupo_id" INTEGER NOT NULL CHECK("grupo_id">=0),
  PRIMARY KEY("linea_id","grupo_id"),
  CONSTRAINT "fk_grupo"
    FOREIGN KEY("grupo_id")
    REFERENCES "grupo"("grupo_id")
    ON UPDATE CASCADE,
  CONSTRAINT "fk_linea2"
    FOREIGN KEY("linea_id")
    REFERENCES "linea"("linea_id")
    ON UPDATE CASCADE
);
CREATE INDEX "linea_grupo.fk_grupo" ON "linea_grupo"("grupo_id");
CREATE INDEX "linea_grupo.fk_linea2" ON "linea_grupo"("linea_id");
CREATE TABLE "parada"(
  "parada_id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL CHECK("parada_id">=0),
  "latitud" VARCHAR(40) NOT NULL,
  "longitud" VARCHAR(40) NOT NULL,
  "lat_sen" VARCHAR(40) NOT NULL,
  "lat_cos" VARCHAR(40) NOT NULL,
  "lng_sen" VARCHAR(40) NOT NULL,
  "lng_cos" VARCHAR(40) NOT NULL
);
CREATE TABLE "provincia"(
  "provincia_id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL CHECK("provincia_id">=0),
  "nombre" VARCHAR(30) NOT NULL
);
CREATE TABLE "recorrido"(
  "recorrido_id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL CHECK("recorrido_id">=0),
  "latitud" VARCHAR(40) NOT NULL,
  "longitud" VARCHAR(40) NOT NULL,
  "linea_id" INTEGER NOT NULL CHECK("linea_id">=0),
  CONSTRAINT "fk_recorrido_linea"
    FOREIGN KEY("linea_id")
    REFERENCES "linea"("linea_id")
    ON UPDATE CASCADE
);
CREATE INDEX "recorrido.fk_recorrido_linea" ON "recorrido"("linea_id");
CREATE TABLE "colectivo"(
  "colectivo_id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL CHECK("colectivo_id">=0),
  "latitud" VARCHAR(40) NOT NULL,
  "longitud" VARCHAR(40) NOT NULL,
  "linea_id" INTEGER NOT NULL CHECK("linea_id">=0),
  CONSTRAINT "fk_colectivo_linea"
    FOREIGN KEY("linea_id")
    REFERENCES "linea"("linea_id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
CREATE INDEX "colectivo.fk_colectivo_linea" ON "colectivo"("linea_id");
CREATE TABLE "departamento"(
  "departamento_id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL CHECK("departamento_id">=0),
  "nombre" VARCHAR(40) NOT NULL,
  "provincia_id" INTEGER NOT NULL CHECK("provincia_id">=0),
  CONSTRAINT "fk_departamento_provincia"
    FOREIGN KEY("provincia_id")
    REFERENCES "provincia"("provincia_id")
    ON UPDATE CASCADE
);
CREATE INDEX "departamento.fk_departamento_provincia" ON "departamento"("provincia_id");
CREATE TABLE "linea_departamento"(
  "linea_id" INTEGER NOT NULL CHECK("linea_id">=0),
  "departamento_id" INTEGER NOT NULL CHECK("departamento_id">=0),
  PRIMARY KEY("linea_id","departamento_id"),
  CONSTRAINT "fk_departamento"
    FOREIGN KEY("departamento_id")
    REFERENCES "departamento"("departamento_id")
    ON UPDATE CASCADE,
  CONSTRAINT "fk_linea"
    FOREIGN KEY("linea_id")
    REFERENCES "linea"("linea_id")
    ON UPDATE CASCADE
);
CREATE INDEX "linea_departamento.fk_departamento" ON "linea_departamento"("departamento_id");
CREATE INDEX "linea_departamento.fk_linea" ON "linea_departamento"("linea_id");
CREATE TABLE "linea_parada"(
  "linea_id" INTEGER NOT NULL CHECK("linea_id">=0),
  "parada_id" INTEGER NOT NULL CHECK("parada_id">=0),
  "posicion" INTEGER NOT NULL CHECK("posicion">=0),
  PRIMARY KEY("linea_id","parada_id"),
  CONSTRAINT "fk_linea3"
    FOREIGN KEY("linea_id")
    REFERENCES "linea"("linea_id")
    ON UPDATE CASCADE,
  CONSTRAINT "fk_parada"
    FOREIGN KEY("parada_id")
    REFERENCES "parada"("parada_id")
    ON UPDATE CASCADE
);
CREATE INDEX "linea_parada.fk_parada" ON "linea_parada"("parada_id");
CREATE INDEX "linea_parada.fk_linea3" ON "linea_parada"("linea_id");
