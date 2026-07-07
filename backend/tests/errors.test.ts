import {
  AppError,
  BadRequestError,
  ServiceUnavailableError,
} from "../src/utils/errors";

describe("error classes", () => {
  it("BadRequestError carries a 400 status and correct identity", () => {
    const err = new BadRequestError("bad");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.statusCode).toBe(400);
    expect(err.constructor.name).toBe("BadRequestError");
  });

  it("ServiceUnavailableError carries a 503 status and correct identity", () => {
    const err = new ServiceUnavailableError("down");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(ServiceUnavailableError);
    expect(err.statusCode).toBe(503);
    expect(err.constructor.name).toBe("ServiceUnavailableError");
  });

  it("preserves subclass identity so it is not flattened to AppError", () => {
    const err = new ServiceUnavailableError("down");
    expect(err instanceof BadRequestError).toBe(false);
  });
});
