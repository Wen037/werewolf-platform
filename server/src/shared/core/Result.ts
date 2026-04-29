export class Result<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  // Use explicit union types instead of ? to satisfy exactOptionalPropertyTypes
  private readonly _value: T | undefined;
  private readonly _error: string | undefined;

  private constructor(isSuccess: boolean, value: T | undefined, error: string | undefined) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._value = value;
    this._error = error;
  }

  public getValue(): T {
    if (!this.isSuccess) throw new Error('Cannot get value of a failure result');
    return this._value as T;
  }

  public getError(): string {
    return this._error ?? 'Unknown error';
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, value, undefined);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error);
  }
}
